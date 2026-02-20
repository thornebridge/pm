import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmProposals,
	crmOpportunities,
	crmCompanies
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const proposals = db
		.select({
			id: crmProposals.id,
			opportunityId: crmProposals.opportunityId,
			opportunityTitle: crmOpportunities.title,
			companyName: crmCompanies.name,
			title: crmProposals.title,
			amount: crmProposals.amount,
			status: crmProposals.status,
			sentAt: crmProposals.sentAt,
			expiresAt: crmProposals.expiresAt,
			createdAt: crmProposals.createdAt
		})
		.from(crmProposals)
		.innerJoin(crmOpportunities, eq(crmProposals.opportunityId, crmOpportunities.id))
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.orderBy(desc(crmProposals.createdAt))
		.all();

	return { proposals };
};
