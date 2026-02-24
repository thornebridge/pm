import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, gmailThreads, gmailMessages, gmailEntityLinks, crmContacts, crmOpportunities } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	const integration = db.select({
		email: gmailIntegrations.email,
		lastSyncAt: gmailIntegrations.lastSyncAt
	}).from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, event.locals.user.id))
		.get();

	// Load contacts for compose autocomplete
	const contacts = db.select({
		id: crmContacts.id,
		firstName: crmContacts.firstName,
		lastName: crmContacts.lastName,
		email: crmContacts.email
	}).from(crmContacts).all();

	return {
		gmailConnected: !!integration,
		gmailEmail: integration?.email || null,
		lastSyncAt: integration?.lastSyncAt || null,
		contacts: contacts.filter((c) => c.email).map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email! }))
	};
};
