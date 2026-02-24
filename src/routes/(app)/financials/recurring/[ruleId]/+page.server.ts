import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { finRecurringRules } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const [rule] = await db
		.select()
		.from(finRecurringRules)
		.where(eq(finRecurringRules.id, params.ruleId));

	if (!rule) {
		throw error(404, 'Recurring rule not found');
	}

	return { rule };
};
