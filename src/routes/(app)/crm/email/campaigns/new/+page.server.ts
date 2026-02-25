import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { crmContacts, crmCompanies, emailTemplates } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	const [contacts, templates] = await Promise.all([
		db.select({
			id: crmContacts.id,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			email: crmContacts.email,
			companyId: crmContacts.companyId,
			source: crmContacts.source
		}).from(crmContacts),
		db.select()
			.from(emailTemplates)
			.where(eq(emailTemplates.userId, event.locals.user.id))
			.orderBy(desc(emailTemplates.updatedAt))
	]);

	// Resolve company names
	const companyIds = [...new Set(contacts.map((c) => c.companyId).filter(Boolean))] as string[];
	const companies = companyIds.length > 0
		? await db.select({ id: crmCompanies.id, name: crmCompanies.name }).from(crmCompanies)
		: [];
	const companyMap = new Map(companies.map((c) => [c.id, c.name]));

	const enrichedContacts = contacts.map((c) => ({
		id: c.id,
		firstName: c.firstName,
		lastName: c.lastName,
		email: c.email,
		companyName: c.companyId ? companyMap.get(c.companyId) || undefined : undefined,
		source: c.source || undefined
	}));

	return { contacts: enrichedContacts, templates };
};
