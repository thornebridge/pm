import { db } from '$lib/server/db/index.js';
import {
	emailCampaigns,
	emailCampaignRecipients,
	emailTemplates,
	gmailIntegrations,
	crmContacts,
	crmActivities
} from '$lib/server/db/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendMessage } from '$lib/server/gmail/gmail-api.js';
import { buildMimeMessage } from '$lib/server/gmail/mime.js';
import { resolveMergeData, applyMergeFields } from '$lib/server/gmail/merge-fields.js';
import { injectTracking, associateTrackingWithMessage } from '$lib/server/gmail/tracking.js';

export function startBulkEmailPoller(): void {
	setTimeout(() => processBulkEmailQueue().catch((e) =>
		console.error('[bulk-email]', e)), 15_000);
	setInterval(() => processBulkEmailQueue().catch((e) =>
		console.error('[bulk-email]', e)), 10_000);
}

async function processBulkEmailQueue(): Promise<void> {
	const activeCampaigns = await db.select()
		.from(emailCampaigns)
		.where(inArray(emailCampaigns.status, ['queued', 'sending']));

	for (const campaign of activeCampaigns) {
		try {
			await processCampaign(campaign);
		} catch (err) {
			console.error(`[bulk-email] Failed to process campaign ${campaign.id}:`, err);
		}
	}
}

async function processCampaign(campaign: typeof emailCampaigns.$inferSelect): Promise<void> {
	// Get Gmail integration
	const [integration] = await db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, campaign.userId));

	if (!integration) {
		await db.update(emailCampaigns)
			.set({ status: 'failed', updatedAt: Date.now() })
			.where(eq(emailCampaigns.id, campaign.id));
		return;
	}

	// Get template
	const [template] = await db.select()
		.from(emailTemplates)
		.where(eq(emailTemplates.id, campaign.templateId));

	if (!template) {
		await db.update(emailCampaigns)
			.set({ status: 'failed', updatedAt: Date.now() })
			.where(eq(emailCampaigns.id, campaign.id));
		return;
	}

	// Check throttle: get most recent sent recipient
	const [lastSent] = await db.select({ sentAt: emailCampaignRecipients.sentAt })
		.from(emailCampaignRecipients)
		.where(and(
			eq(emailCampaignRecipients.campaignId, campaign.id),
			eq(emailCampaignRecipients.status, 'sent')
		))
		.orderBy(desc(emailCampaignRecipients.sentAt))
		.limit(1);

	if (lastSent?.sentAt && Date.now() - lastSent.sentAt < campaign.throttleMs) {
		return; // Throttled, wait for next poll
	}

	// Get next pending recipient
	const [recipient] = await db.select()
		.from(emailCampaignRecipients)
		.where(and(
			eq(emailCampaignRecipients.campaignId, campaign.id),
			eq(emailCampaignRecipients.status, 'pending')
		))
		.limit(1);

	if (!recipient) {
		// Check if all recipients are done
		const [pendingSending] = await db.select({ id: emailCampaignRecipients.id })
			.from(emailCampaignRecipients)
			.where(and(
				eq(emailCampaignRecipients.campaignId, campaign.id),
				inArray(emailCampaignRecipients.status, ['pending', 'sending'])
			))
			.limit(1);

		if (!pendingSending) {
			await db.update(emailCampaigns)
				.set({ status: 'completed', completedAt: Date.now(), updatedAt: Date.now() })
				.where(eq(emailCampaigns.id, campaign.id));
		}
		return;
	}

	// Mark as sending
	await db.update(emailCampaignRecipients)
		.set({ status: 'sending' })
		.where(eq(emailCampaignRecipients.id, recipient.id));

	// Update campaign to 'sending' if still queued
	if (campaign.status === 'queued') {
		await db.update(emailCampaigns)
			.set({ status: 'sending', startedAt: campaign.startedAt || Date.now(), updatedAt: Date.now() })
			.where(eq(emailCampaigns.id, campaign.id));
	}

	// Fetch contact
	const [contact] = await db.select()
		.from(crmContacts)
		.where(eq(crmContacts.id, recipient.contactId));

	if (!contact?.email) {
		await db.update(emailCampaignRecipients)
			.set({ status: 'skipped', errorMessage: 'No email address' })
			.where(eq(emailCampaignRecipients.id, recipient.id));
		return;
	}

	try {
		// Resolve merge fields
		const mergeData = await resolveMergeData({
			contactId: recipient.contactId,
			opportunityId: recipient.opportunityId || undefined
		});
		const subject = applyMergeFields(template.subjectTemplate, mergeData);
		let html = applyMergeFields(template.bodyTemplate, mergeData).replace(/\n/g, '<br>');

		// Inject tracking
		let trackingTokenId: string | undefined;
		const trackingResult = await injectTracking({
			html,
			userId: campaign.userId,
			recipientEmail: contact.email,
			subject
		});
		html = trackingResult.html;
		trackingTokenId = trackingResult.tokenId;

		// Build and send
		const raw = buildMimeMessage({
			from: integration.email,
			to: [contact.email],
			subject,
			html
		});

		const result = await sendMessage(campaign.userId, raw);
		const now = Date.now();

		// Mark recipient as sent
		await db.update(emailCampaignRecipients)
			.set({
				status: 'sent',
				sentAt: now,
				gmailMessageId: result.id,
				gmailThreadId: result.threadId
			})
			.where(eq(emailCampaignRecipients.id, recipient.id));

		// Increment campaign sent count
		await db.update(emailCampaigns)
			.set({ sentCount: campaign.sentCount + 1, updatedAt: now })
			.where(eq(emailCampaigns.id, campaign.id));

		// Associate tracking
		if (trackingTokenId) {
			await associateTrackingWithMessage(trackingTokenId, result.id, result.threadId);
		}

		// Create CRM activity linked to contact
		await db.insert(crmActivities).values({
			id: nanoid(12),
			type: 'email',
			subject: `Sent: ${subject}`,
			description: `Campaign "${campaign.name}" — email sent to ${contact.email}`,
			contactId: recipient.contactId,
			userId: campaign.userId,
			createdAt: now,
			updatedAt: now
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';

		await db.update(emailCampaignRecipients)
			.set({
				status: 'failed',
				errorMessage,
				retryCount: recipient.retryCount + 1
			})
			.where(eq(emailCampaignRecipients.id, recipient.id));

		await db.update(emailCampaigns)
			.set({ failedCount: campaign.failedCount + 1, updatedAt: Date.now() })
			.where(eq(emailCampaigns.id, campaign.id));

		// If auth error, fail the whole campaign
		if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('authentication')) {
			await db.update(emailCampaigns)
				.set({ status: 'failed', updatedAt: Date.now() })
				.where(eq(emailCampaigns.id, campaign.id));
		}
	}
}
