import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, crmActivities } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendMessage, getMessage } from '$lib/server/gmail/gmail-api.js';
import { buildMimeMessage } from '$lib/server/gmail/mime.js';
import { injectTracking, associateTrackingWithMessage } from '$lib/server/gmail/tracking.js';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [integration] = await db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, user.id));

	if (!integration) {
		return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const { to, cc, subject, html, replyToMessageId, threadId, trackOpens } = body as {
		to: string[];
		cc?: string[];
		subject: string;
		html: string;
		replyToMessageId?: string;
		threadId?: string;
		trackOpens?: boolean;
	};

	if (!to?.length || !subject || !html) {
		return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		let processedHtml = html;
		let trackingTokenId: string | undefined;

		// Inject tracking for non-reply emails when tracking is enabled
		const shouldTrack = trackOpens !== false && !replyToMessageId;
		if (shouldTrack) {
			const result = await injectTracking({
				html,
				userId: user.id,
				recipientEmail: to[0],
				subject
			});
			processedHtml = result.html;
			trackingTokenId = result.tokenId;
		}

		const raw = buildMimeMessage({
			from: integration.email,
			to,
			cc,
			subject,
			html: processedHtml,
			inReplyTo: replyToMessageId,
			references: replyToMessageId
		});

		const result = await sendMessage(user.id, raw, threadId);

		// Associate tracking token with the sent message
		if (trackingTokenId) {
			await associateTrackingWithMessage(trackingTokenId, result.id, result.threadId);
		}

		// Sync the sent message locally
		try {
			const { incrementalSync } = await import('$lib/server/gmail/sync.js');
			if (integration.historyId) {
				await incrementalSync(user.id);
			}
		} catch {
			// Non-critical: message was sent, sync will catch up
		}

		// Create a CRM activity for the sent email
		const now = Date.now();
		await db.insert(crmActivities).values({
			id: nanoid(12),
			type: 'email',
			subject: `Sent: ${subject}`,
			description: `Email sent to ${to.join(', ')}`,
			userId: user.id,
			createdAt: now,
			updatedAt: now
		});

		return Response.json({ ok: true, messageId: result.id, threadId: result.threadId });
	} catch (err) {
		console.error('[gmail] Send failed:', err);
		return new Response(JSON.stringify({ error: 'Failed to send email' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
