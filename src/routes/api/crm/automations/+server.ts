import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmAutomationRules, crmAutomationExecutions } from '$lib/server/db/schema.js';
import { eq, desc, count, max, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { validateCrmRule } from '$lib/server/crm-automations/validate.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const rules = db.select().from(crmAutomationRules).orderBy(desc(crmAutomationRules.createdAt)).all();

	// Get stats for each rule
	const rulesWithStats = rules.map((rule) => {
		const stats = db
			.select({
				runCount: count(),
				lastRun: max(crmAutomationExecutions.createdAt),
				errorCount: sql<number>`SUM(CASE WHEN ${crmAutomationExecutions.status} = 'error' THEN 1 ELSE 0 END)`
			})
			.from(crmAutomationExecutions)
			.where(eq(crmAutomationExecutions.ruleId, rule.id))
			.get();

		return {
			...rule,
			trigger: JSON.parse(rule.trigger),
			conditions: rule.conditions ? JSON.parse(rule.conditions) : null,
			actions: JSON.parse(rule.actions),
			runCount: stats?.runCount || 0,
			lastRun: stats?.lastRun || null,
			errorCount: stats?.errorCount || 0
		};
	});

	return json(rulesWithStats);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const error = validateCrmRule(body);
	if (error) return json({ error }, { status: 400 });

	const now = Date.now();
	const rule = {
		id: nanoid(12),
		name: body.name.trim(),
		description: body.description?.trim() || null,
		entityType: body.entityType || 'opportunity',
		trigger: JSON.stringify(body.trigger),
		conditions: body.conditions ? JSON.stringify(body.conditions) : null,
		actions: JSON.stringify(body.actions),
		enabled: body.enabled !== false,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(crmAutomationRules).values(rule).run();

	return json({
		...rule,
		trigger: body.trigger,
		conditions: body.conditions || null,
		actions: body.actions
	}, { status: 201 });
};
