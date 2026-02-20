import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmPipelineStages, crmCompanies, crmProducts, users } from '$lib/server/db/schema.js';
import { asc, eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ parent }) => {
	await parent();

	const stages = db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position))
		.all();

	const members = db
		.select({ id: users.id, name: users.name })
		.from(users)
		.all();

	const companies = db
		.select({ id: crmCompanies.id, name: crmCompanies.name })
		.from(crmCompanies)
		.orderBy(asc(crmCompanies.name))
		.all();

	const products = db
		.select({ id: crmProducts.id, name: crmProducts.name, sku: crmProducts.sku })
		.from(crmProducts)
		.where(eq(crmProducts.status, 'active'))
		.orderBy(asc(crmProducts.name))
		.all();

	return { stages, members, crmCompanies: companies, crmProducts: products };
};
