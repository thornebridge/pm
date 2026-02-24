import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmTasks,
	crmCompanies,
	crmContacts,
	crmOpportunities,
	users
} from '$lib/server/db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const tasks = await db
		.select({
			id: crmTasks.id,
			title: crmTasks.title,
			description: crmTasks.description,
			dueDate: crmTasks.dueDate,
			completedAt: crmTasks.completedAt,
			priority: crmTasks.priority,
			companyId: crmTasks.companyId,
			companyName: crmCompanies.name,
			contactId: crmTasks.contactId,
			opportunityId: crmTasks.opportunityId,
			assigneeId: crmTasks.assigneeId,
			assigneeName: users.name,
			createdAt: crmTasks.createdAt
		})
		.from(crmTasks)
		.leftJoin(crmCompanies, eq(crmTasks.companyId, crmCompanies.id))
		.leftJoin(users, eq(crmTasks.assigneeId, users.id))
		.orderBy(asc(crmTasks.dueDate), desc(crmTasks.createdAt));

	// Get opportunity titles
	const oppIds = [...new Set(tasks.filter((t) => t.opportunityId).map((t) => t.opportunityId!))];
	const oppMap = new Map<string, string>();
	for (const oId of oppIds) {
		const [o] = await db.select({ title: crmOpportunities.title }).from(crmOpportunities).where(eq(crmOpportunities.id, oId));
		if (o) oppMap.set(oId, o.title);
	}

	// Get contact names
	const contactIds = [...new Set(tasks.filter((t) => t.contactId).map((t) => t.contactId!))];
	const contactMap = new Map<string, string>();
	for (const cId of contactIds) {
		const [c] = await db.select({ firstName: crmContacts.firstName, lastName: crmContacts.lastName }).from(crmContacts).where(eq(crmContacts.id, cId));
		if (c) contactMap.set(cId, `${c.firstName} ${c.lastName}`);
	}

	return {
		tasks: tasks.map((t) => ({
			...t,
			opportunityTitle: t.opportunityId ? oppMap.get(t.opportunityId) || null : null,
			contactName: t.contactId ? contactMap.get(t.contactId) || null : null
		})),
		currentUserId: user.id
	};
};
