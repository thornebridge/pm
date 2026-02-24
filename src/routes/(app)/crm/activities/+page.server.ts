import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmActivities,
	crmCompanies,
	crmContacts,
	crmOpportunities,
	users
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const activities = await db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			description: crmActivities.description,
			companyId: crmActivities.companyId,
			companyName: crmCompanies.name,
			contactId: crmActivities.contactId,
			opportunityId: crmActivities.opportunityId,
			scheduledAt: crmActivities.scheduledAt,
			completedAt: crmActivities.completedAt,
			durationMinutes: crmActivities.durationMinutes,
			userId: crmActivities.userId,
			userName: users.name,
			createdAt: crmActivities.createdAt
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.leftJoin(crmCompanies, eq(crmActivities.companyId, crmCompanies.id))
		.orderBy(desc(crmActivities.createdAt))
		.limit(100);

	// Get contact names and opportunity titles for display
	const contactIds = [...new Set(activities.filter((a) => a.contactId).map((a) => a.contactId!))];
	const oppIds = [...new Set(activities.filter((a) => a.opportunityId).map((a) => a.opportunityId!))];

	const contactMap = new Map<string, string>();
	for (const cId of contactIds) {
		const [c] = await db.select({ firstName: crmContacts.firstName, lastName: crmContacts.lastName }).from(crmContacts).where(eq(crmContacts.id, cId));
		if (c) contactMap.set(cId, `${c.firstName} ${c.lastName}`);
	}

	const oppMap = new Map<string, string>();
	for (const oId of oppIds) {
		const [o] = await db.select({ title: crmOpportunities.title }).from(crmOpportunities).where(eq(crmOpportunities.id, oId));
		if (o) oppMap.set(oId, o.title);
	}

	return {
		activities: activities.map((a) => ({
			...a,
			contactName: a.contactId ? contactMap.get(a.contactId) || null : null,
			opportunityTitle: a.opportunityId ? oppMap.get(a.opportunityId) || null : null
		}))
	};
};
