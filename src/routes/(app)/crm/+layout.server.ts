import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmPipelineStages, crmCompanies, users } from '$lib/server/db/schema.js';
import { asc } from 'drizzle-orm';

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

	return { stages, members, crmCompanies: companies };
};
