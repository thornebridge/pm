import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmPipelineStages, crmLeadStatuses, crmCompanies, crmProducts, users } from '$lib/server/db/schema.js';
import { asc, eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ parent }) => {
	await parent();

	const stages = await db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position));

	const leadStatuses = await db
		.select()
		.from(crmLeadStatuses)
		.orderBy(asc(crmLeadStatuses.position));

	const members = await db
		.select({ id: users.id, name: users.name })
		.from(users);

	const companies = await db
		.select({ id: crmCompanies.id, name: crmCompanies.name })
		.from(crmCompanies)
		.orderBy(asc(crmCompanies.name));

	const products = await db
		.select({ id: crmProducts.id, name: crmProducts.name, sku: crmProducts.sku })
		.from(crmProducts)
		.where(eq(crmProducts.status, 'active'))
		.orderBy(asc(crmProducts.name));

	return { stages, leadStatuses, members, crmCompanies: companies, crmProducts: products };
};
