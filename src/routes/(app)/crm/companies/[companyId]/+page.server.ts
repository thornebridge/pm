import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmCompanies,
	crmContacts,
	crmOpportunities,
	crmActivities,
	crmTasks,
	crmPipelineStages,
	users
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const [company] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, params.companyId));
	if (!company) throw error(404, 'Company not found');

	const owner = company.ownerId
		? (await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, company.ownerId)))[0]
		: null;

	const contacts = await db
		.select()
		.from(crmContacts)
		.where(eq(crmContacts.companyId, params.companyId))
		.orderBy(desc(crmContacts.createdAt));

	const opportunities = await db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			priority: crmOpportunities.priority,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			stageId: crmOpportunities.stageId,
			stageName: crmPipelineStages.name,
			stageColor: crmPipelineStages.color,
			createdAt: crmOpportunities.createdAt
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(eq(crmOpportunities.companyId, params.companyId))
		.orderBy(desc(crmOpportunities.createdAt));

	const activities = await db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			description: crmActivities.description,
			scheduledAt: crmActivities.scheduledAt,
			completedAt: crmActivities.completedAt,
			userName: users.name,
			createdAt: crmActivities.createdAt
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.where(eq(crmActivities.companyId, params.companyId))
		.orderBy(desc(crmActivities.createdAt))
		.limit(20);

	const tasks = await db
		.select({
			id: crmTasks.id,
			title: crmTasks.title,
			dueDate: crmTasks.dueDate,
			completedAt: crmTasks.completedAt,
			priority: crmTasks.priority,
			assigneeName: users.name
		})
		.from(crmTasks)
		.leftJoin(users, eq(crmTasks.assigneeId, users.id))
		.where(eq(crmTasks.companyId, params.companyId))
		.orderBy(desc(crmTasks.createdAt));

	return { company, owner, contacts, opportunities, activities, tasks };
};
