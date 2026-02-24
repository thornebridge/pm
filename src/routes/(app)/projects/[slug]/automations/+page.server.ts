import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { automationRules, automationExecutions } from '$lib/server/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	const rules = await db
		.select()
		.from(automationRules)
		.where(eq(automationRules.projectId, project.id))
		.orderBy(desc(automationRules.createdAt));

	const ruleIds = rules.map((r) => r.id);

	const execStats = ruleIds.length > 0
		? await db
			.select({
				ruleId: automationExecutions.ruleId,
				count: sql<number>`count(*)`,
				lastRun: sql<number>`max(${automationExecutions.createdAt})`,
				errorCount: sql<number>`sum(case when ${automationExecutions.status} = 'error' then 1 else 0 end)`
			})
			.from(automationExecutions)
			.groupBy(automationExecutions.ruleId)
		: [];

	const statsMap = new Map(execStats.map((s) => [s.ruleId, s]));

	const automations = rules.map((r) => {
		const stats = statsMap.get(r.id);
		return {
			...r,
			trigger: JSON.parse(r.trigger),
			conditions: r.conditions ? JSON.parse(r.conditions) : null,
			actions: JSON.parse(r.actions),
			runCount: stats?.count || 0,
			lastRun: stats?.lastRun || null,
			errorCount: stats?.errorCount || 0
		};
	});

	return { automations };
};
