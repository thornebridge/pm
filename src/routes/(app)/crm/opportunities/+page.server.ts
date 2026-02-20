import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmCompanies,
	crmPipelineStages,
	users
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const opportunities = db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			companyId: crmOpportunities.companyId,
			companyName: crmCompanies.name,
			stageId: crmOpportunities.stageId,
			stageName: crmPipelineStages.name,
			stageColor: crmPipelineStages.color,
			stageClosed: crmPipelineStages.isClosed,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			probability: crmOpportunities.probability,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			priority: crmOpportunities.priority,
			source: crmOpportunities.source,
			ownerId: crmOpportunities.ownerId,
			ownerName: users.name,
			createdAt: crmOpportunities.createdAt
		})
		.from(crmOpportunities)
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
		.orderBy(desc(crmOpportunities.createdAt))
		.all();

	return { opportunities };
};
