import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, crmContacts } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { validateConnection } from '$lib/server/gmail/gmail-api.js';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	const [integration] = await db.select({
		email: gmailIntegrations.email,
		lastSyncAt: gmailIntegrations.lastSyncAt,
		syncStatus: gmailIntegrations.syncStatus,
		syncError: gmailIntegrations.syncError,
		historyId: gmailIntegrations.historyId
	}).from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, event.locals.user.id));

	// If connected but has an error or never synced, run a live connection check
	let connectionError: string | null = null;
	if (integration && (integration.syncStatus === 'error' || !integration.lastSyncAt)) {
		const check = await validateConnection(event.locals.user.id);
		if (!check.ok) {
			connectionError = check.error || 'Gmail connection check failed';
			// Persist the error so it shows up even without page reload
			await db.update(gmailIntegrations)
				.set({ syncStatus: 'error', syncError: connectionError, updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, event.locals.user.id));
		}
	}

	// Load contacts for compose autocomplete
	const contacts = await db.select({
		id: crmContacts.id,
		firstName: crmContacts.firstName,
		lastName: crmContacts.lastName,
		email: crmContacts.email
	}).from(crmContacts);

	return {
		gmailConnected: !!integration,
		gmailEmail: integration?.email || null,
		lastSyncAt: integration?.lastSyncAt || null,
		syncStatus: integration?.syncStatus || null,
		syncError: connectionError || integration?.syncError || null,
		hasSynced: !!integration?.historyId,
		contacts: contacts.filter((c) => c.email).map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email! }))
	};
};
