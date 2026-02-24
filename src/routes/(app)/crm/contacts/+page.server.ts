import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmContacts, crmCompanies, users } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const contacts = await db
		.select({
			id: crmContacts.id,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			email: crmContacts.email,
			phone: crmContacts.phone,
			title: crmContacts.title,
			isPrimary: crmContacts.isPrimary,
			source: crmContacts.source,
			companyId: crmContacts.companyId,
			companyName: crmCompanies.name,
			ownerId: crmContacts.ownerId,
			ownerName: users.name,
			createdAt: crmContacts.createdAt
		})
		.from(crmContacts)
		.leftJoin(crmCompanies, eq(crmContacts.companyId, crmCompanies.id))
		.leftJoin(users, eq(crmContacts.ownerId, users.id))
		.orderBy(desc(crmContacts.createdAt));

	return { contacts };
};
