import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmCompanies,
	crmPipelineStages,
	users
} from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

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
				ownerName: users.name
			})
			.from(crmOpportunities)
			.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
			.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
			.orderBy(asc(crmOpportunities.position))
			.all()
			.filter((o) => openStageIds.includes(o.stageId));
	}

	return { stages, opportunities };
};
