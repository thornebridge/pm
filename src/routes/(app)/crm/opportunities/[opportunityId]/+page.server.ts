import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmCompanies,
	crmContacts,
	crmPipelineStages,
	crmOpportunityContacts,
	crmOpportunityItems,
	crmProducts,
	crmActivities,
	crmProposals,
	crmTasks,
	users,
	gmailEntityLinks,
	gmailThreads
} from '$lib/server/db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const [opp] = await db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, params.opportunityId));
	if (!opp) throw error(404, 'Opportunity not found');

	const [stage] = await db
		.select()
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.id, opp.stageId));

	const [company] = await db
		.select()
		.from(crmCompanies)
		.where(eq(crmCompanies.id, opp.companyId));

	const contact = opp.contactId
		? (await db.select().from(crmContacts).where(eq(crmContacts.id, opp.contactId)))[0]
		: null;

	const owner = opp.ownerId
		? (await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, opp.ownerId)))[0]
		: null;

	const linkedContacts = await db
		.select({
			contactId: crmOpportunityContacts.contactId,
			role: crmOpportunityContacts.role,
			influence: crmOpportunityContacts.influence,
			sentiment: crmOpportunityContacts.sentiment,
			notes: crmOpportunityContacts.notes,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			email: crmContacts.email,
			title: crmContacts.title
		})
		.from(crmOpportunityContacts)
		.innerJoin(crmContacts, eq(crmOpportunityContacts.contactId, crmContacts.id))
		.where(eq(crmOpportunityContacts.opportunityId, params.opportunityId));

	const activities = await db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			description: crmActivities.description,
			userName: users.name,
			createdAt: crmActivities.createdAt
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.where(eq(crmActivities.opportunityId, params.opportunityId))
		.orderBy(desc(crmActivities.createdAt))
		.limit(20);

	const proposals = await db
		.select()
		.from(crmProposals)
		.where(eq(crmProposals.opportunityId, params.opportunityId))
		.orderBy(desc(crmProposals.createdAt));

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
		.where(eq(crmTasks.opportunityId, params.opportunityId))
		.orderBy(desc(crmTasks.createdAt));

	// Get all contacts for this company (for linking)
	const companyContacts = company
		? await db
				.select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName })
				.from(crmContacts)
				.where(eq(crmContacts.companyId, company.id))
		: [];

	// Get opportunity line items with product info
	const opportunityItems = await db
		.select({
			id: crmOpportunityItems.id,
			opportunityId: crmOpportunityItems.opportunityId,
			productId: crmOpportunityItems.productId,
			priceTierId: crmOpportunityItems.priceTierId,
			description: crmOpportunityItems.description,
			quantity: crmOpportunityItems.quantity,
			unitAmount: crmOpportunityItems.unitAmount,
			discountPercent: crmOpportunityItems.discountPercent,
			discountAmount: crmOpportunityItems.discountAmount,
			setupFee: crmOpportunityItems.setupFee,
			billingModel: crmOpportunityItems.billingModel,
			billingInterval: crmOpportunityItems.billingInterval,
			position: crmOpportunityItems.position,
			createdAt: crmOpportunityItems.createdAt,
			productName: crmProducts.name,
			productSku: crmProducts.sku
		})
		.from(crmOpportunityItems)
		.innerJoin(crmProducts, eq(crmOpportunityItems.productId, crmProducts.id))
		.where(eq(crmOpportunityItems.opportunityId, params.opportunityId))
		.orderBy(asc(crmOpportunityItems.position));

	// Get linked email threads
	const emailLinks = await db.select({ threadId: gmailEntityLinks.threadId })
		.from(gmailEntityLinks)
		.where(eq(gmailEntityLinks.opportunityId, params.opportunityId));
	const emailThreadIds = [...new Set(emailLinks.map((l) => l.threadId))];
	const emails: Array<typeof gmailThreads.$inferSelect> = [];
	for (const tid of emailThreadIds) {
		const [t] = await db.select().from(gmailThreads).where(eq(gmailThreads.id, tid));
		if (t) emails.push(t);
	}
	emails.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

	// Compute deal health metrics
	const now = Date.now();
	const lastActivity = activities.length > 0 ? activities[0].createdAt : null;
	const daysSinceLastActivity = lastActivity ? Math.floor((now - lastActivity) / 86400000) : null;
	const daysInStage = opp.stageEnteredAt ? Math.floor((now - opp.stageEnteredAt) / 86400000) : null;

	let nextStepStatus: 'on_track' | 'due_soon' | 'overdue' | 'not_set' = 'not_set';
	if (opp.nextStep) {
		if (!opp.nextStepDueDate) {
			nextStepStatus = 'on_track';
		} else {
			const daysUntilDue = Math.ceil((opp.nextStepDueDate - now) / 86400000);
			if (daysUntilDue < 0) nextStepStatus = 'overdue';
			else if (daysUntilDue <= 1) nextStepStatus = 'due_soon';
			else nextStepStatus = 'on_track';
		}
	}

	return {
		opportunity: opp,
		stage,
		company,
		contact,
		owner,
		linkedContacts,
		activities,
		proposals,
		tasks,
		companyContacts,
		opportunityItems,
		emails,
		dealHealth: {
			daysSinceLastActivity,
			daysInStage,
			nextStepStatus,
			isStale: daysSinceLastActivity !== null && daysSinceLastActivity >= 7,
			isAging: daysSinceLastActivity !== null && daysSinceLastActivity >= 3
		}
	};
};
