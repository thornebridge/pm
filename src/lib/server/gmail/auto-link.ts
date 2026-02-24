import { db } from '$lib/server/db/index.js';
import {
	gmailMessages,
	gmailIntegrations,
	gmailEntityLinks,
	crmContacts,
	crmOpportunityContacts
} from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function autoLinkThread(threadId: string, userId: string): Promise<void> {
	// Get the user's own email to exclude
	const [integration] = await db.select({ email: gmailIntegrations.email })
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, userId));
	const ownEmail = integration?.email?.toLowerCase() || '';

	// Collect all email addresses from this thread's messages
	const messages = await db.select({
		fromEmail: gmailMessages.fromEmail,
		toEmails: gmailMessages.toEmails,
		ccEmails: gmailMessages.ccEmails
	}).from(gmailMessages).where(eq(gmailMessages.threadId, threadId));

	const emailSet = new Set<string>();
	for (const msg of messages) {
		if (msg.fromEmail) emailSet.add(msg.fromEmail.toLowerCase());
		try {
			const toList: string[] = JSON.parse(msg.toEmails || '[]');
			toList.forEach((e) => emailSet.add(e.toLowerCase()));
		} catch { /* empty */ }
		try {
			const ccList: string[] = JSON.parse(msg.ccEmails || '[]');
			ccList.forEach((e) => emailSet.add(e.toLowerCase()));
		} catch { /* empty */ }
	}

	// Remove user's own email
	emailSet.delete(ownEmail);
	if (emailSet.size === 0) return;

	const now = Date.now();

	// Get existing links for this thread to avoid duplicates
	const existingLinks = await db.select()
		.from(gmailEntityLinks)
		.where(eq(gmailEntityLinks.threadId, threadId));

	const linkedContactIds = new Set(existingLinks.filter((l) => l.contactId).map((l) => l.contactId!));
	const linkedCompanyIds = new Set(existingLinks.filter((l) => l.companyId).map((l) => l.companyId!));
	const linkedOppIds = new Set(existingLinks.filter((l) => l.opportunityId).map((l) => l.opportunityId!));

	for (const email of emailSet) {
		// Look up CRM contacts by email
		const contacts = await db.select()
			.from(crmContacts)
			.where(eq(crmContacts.email, email));

		for (const contact of contacts) {
			// Link to contact
			if (!linkedContactIds.has(contact.id)) {
				await db.insert(gmailEntityLinks).values({
					id: nanoid(12),
					threadId,
					contactId: contact.id,
					linkType: 'auto',
					createdAt: now
				});
				linkedContactIds.add(contact.id);
			}

			// Link to company
			if (contact.companyId && !linkedCompanyIds.has(contact.companyId)) {
				await db.insert(gmailEntityLinks).values({
					id: nanoid(12),
					threadId,
					companyId: contact.companyId,
					linkType: 'auto',
					createdAt: now
				});
				linkedCompanyIds.add(contact.companyId);
			}

			// Link to opportunities via crmOpportunityContacts
			const oppLinks = await db.select({ opportunityId: crmOpportunityContacts.opportunityId })
				.from(crmOpportunityContacts)
				.where(eq(crmOpportunityContacts.contactId, contact.id));

			for (const oppLink of oppLinks) {
				if (!linkedOppIds.has(oppLink.opportunityId)) {
					await db.insert(gmailEntityLinks).values({
						id: nanoid(12),
						threadId,
						opportunityId: oppLink.opportunityId,
						linkType: 'auto',
						createdAt: now
					});
					linkedOppIds.add(oppLink.opportunityId);
				}
			}
		}
	}
}
