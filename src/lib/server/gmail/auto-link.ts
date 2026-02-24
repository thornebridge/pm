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

export function autoLinkThread(threadId: string, userId: string): void {
	// Get the user's own email to exclude
	const integration = db.select({ email: gmailIntegrations.email })
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, userId))
		.get();
	const ownEmail = integration?.email?.toLowerCase() || '';

	// Collect all email addresses from this thread's messages
	const messages = db.select({
		fromEmail: gmailMessages.fromEmail,
		toEmails: gmailMessages.toEmails,
		ccEmails: gmailMessages.ccEmails
	}).from(gmailMessages).where(eq(gmailMessages.threadId, threadId)).all();

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
	const existingLinks = db.select()
		.from(gmailEntityLinks)
		.where(eq(gmailEntityLinks.threadId, threadId))
		.all();

	const linkedContactIds = new Set(existingLinks.filter((l) => l.contactId).map((l) => l.contactId!));
	const linkedCompanyIds = new Set(existingLinks.filter((l) => l.companyId).map((l) => l.companyId!));
	const linkedOppIds = new Set(existingLinks.filter((l) => l.opportunityId).map((l) => l.opportunityId!));

	for (const email of emailSet) {
		// Look up CRM contacts by email
		const contacts = db.select()
			.from(crmContacts)
			.where(eq(crmContacts.email, email))
			.all();

		for (const contact of contacts) {
			// Link to contact
			if (!linkedContactIds.has(contact.id)) {
				db.insert(gmailEntityLinks).values({
					id: nanoid(12),
					threadId,
					contactId: contact.id,
					linkType: 'auto',
					createdAt: now
				}).run();
				linkedContactIds.add(contact.id);
			}

			// Link to company
			if (contact.companyId && !linkedCompanyIds.has(contact.companyId)) {
				db.insert(gmailEntityLinks).values({
					id: nanoid(12),
					threadId,
					companyId: contact.companyId,
					linkType: 'auto',
					createdAt: now
				}).run();
				linkedCompanyIds.add(contact.companyId);
			}

			// Link to opportunities via crmOpportunityContacts
			const oppLinks = db.select({ opportunityId: crmOpportunityContacts.opportunityId })
				.from(crmOpportunityContacts)
				.where(eq(crmOpportunityContacts.contactId, contact.id))
				.all();

			for (const oppLink of oppLinks) {
				if (!linkedOppIds.has(oppLink.opportunityId)) {
					db.insert(gmailEntityLinks).values({
						id: nanoid(12),
						threadId,
						opportunityId: oppLink.opportunityId,
						linkType: 'auto',
						createdAt: now
					}).run();
					linkedOppIds.add(oppLink.opportunityId);
				}
			}
		}
	}
}
