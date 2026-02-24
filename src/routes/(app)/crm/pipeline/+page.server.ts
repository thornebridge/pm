import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmCompanies,
	crmPipelineStages,
	crmActivities,
	users
} from '$lib/server/db/schema.js';
import { eq, asc, sql, inArray, max } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const stages = db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position))
		.all();

	const openStageIds = stages.filter((s) => !s.isClosed).map((s) => s.id);

	let opportunities: Array<{
		id: string;
		title: string;
		companyId: string;
		companyName: string;
		stageId: string;
		value: number | null;
		currency: string;
		probability: number | null;
		expectedCloseDate: number | null;
		priority: string;
		position: number;
		ownerId: string | null;
		ownerName: string | null;
		nextStep: string | null;
		nextStepDueDate: number | null;
		stageEnteredAt: number | null;
	}> = [];

	if (openStageIds.length > 0) {
		opportunities = db
			.select({
				id: crmOpportunities.id,
				title: crmOpportunities.title,
				companyId: crmOpportunities.companyId,
				companyName: crmCompanies.name,
				stageId: crmOpportunities.stageId,
				value: crmOpportunities.value,
				currency: crmOpportunities.currency,
				probability: crmOpportunities.probability,
				expectedCloseDate: crmOpportunities.expectedCloseDate,
				priority: crmOpportunities.priority,
				position: crmOpportunities.position,
				ownerId: crmOpportunities.ownerId,
				ownerName: users.name,
				nextStep: crmOpportunities.nextStep,
				nextStepDueDate: crmOpportunities.nextStepDueDate,
				stageEnteredAt: crmOpportunities.stageEnteredAt
			})
			.from(crmOpportunities)
			.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
			.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
			.orderBy(asc(crmOpportunities.position))
			.all()
			.filter((o) => openStageIds.includes(o.stageId));
	}

	// Compute last activity dates for all open opportunities
	const oppIds = opportunities.map((o) => o.id);
	const lastActivities: Record<string, number> = {};
	if (oppIds.length > 0) {
		const actRows = db
			.select({
				opportunityId: crmActivities.opportunityId,
				lastAt: max(crmActivities.createdAt)
			})
			.from(crmActivities)
			.where(inArray(crmActivities.opportunityId, oppIds))
			.groupBy(crmActivities.opportunityId)
			.all();
		for (const row of actRows) {
			if (row.opportunityId && row.lastAt) {
				lastActivities[row.opportunityId] = row.lastAt;
			}
		}
	}

	return { stages, opportunities, lastActivities };
};
