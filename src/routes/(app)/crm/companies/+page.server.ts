import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmCompanies, crmContacts, crmOpportunities, crmPipelineStages, users } from '$lib/server/db/schema.js';
import { eq, desc, count, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const companies = await db
		.select({
			id: crmCompanies.id,
			name: crmCompanies.name,
			website: crmCompanies.website,
			industry: crmCompanies.industry,
			size: crmCompanies.size,
			phone: crmCompanies.phone,
			city: crmCompanies.city,
			state: crmCompanies.state,
			ownerId: crmCompanies.ownerId,
			ownerName: users.name,
			createdAt: crmCompanies.createdAt
		})
		.from(crmCompanies)
		.leftJoin(users, eq(crmCompanies.ownerId, users.id))
		.orderBy(desc(crmCompanies.createdAt));

	// Get contact counts per company
	const contactCounts = await db
		.select({
			companyId: crmContacts.companyId,
			n: count()
		})
		.from(crmContacts)
		.groupBy(crmContacts.companyId);

	// Get open opportunity counts per company
	const openStagesRows = await db
		.select({ id: crmPipelineStages.id })
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.isClosed, false));
	const openStages = openStagesRows.map((s) => s.id);

	let oppCounts: { companyId: string; n: number }[] = [];
	if (openStages.length > 0) {
		oppCounts = await db
			.select({
				companyId: crmOpportunities.companyId,
				n: count()
			})
			.from(crmOpportunities)
			.where(
				sql`${crmOpportunities.stageId} IN (${sql.join(
					openStages.map((id) => sql`${id}`),
					sql`,`
				)})`
			)
			.groupBy(crmOpportunities.companyId);
	}

	const contactMap = new Map(contactCounts.map((c) => [c.companyId, c.n]));
	const oppMap = new Map(oppCounts.map((o) => [o.companyId, o.n]));

	return {
		companies: companies.map((c) => ({
			...c,
			contactCount: contactMap.get(c.id) || 0,
			oppCount: oppMap.get(c.id) || 0
		}))
	};
};
