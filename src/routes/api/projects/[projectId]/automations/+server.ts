import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { automationRules, automationExecutions } from '$lib/server/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { validateRule } from '$lib/server/automations/validate.js';
import { broadcastAutomationChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const projectId = event.params.projectId;

	const rules = db
		.select()
		.from(automationRules)
		.where(eq(automationRules.projectId, projectId))
		.orderBy(desc(automationRules.createdAt))
		.all();

	// Get execution counts and last run per rule
	const ruleIds = rules.map((r) => r.id);
	const execStats = ruleIds.length > 0
		? db
			.select({
				ruleId: automationExecutions.ruleId,
				count: sql<number>`count(*)`,
				lastRun: sql<number>`max(${automationExecutions.createdAt})`,
				errorCount: sql<number>`sum(case when ${automationExecutions.status} = 'error' then 1 else 0 end)`
			})
			.from(automationExecutions)
			.groupBy(automationExecutions.ruleId)
			.all()
		: [];

	const statsMap = new Map(execStats.map((s) => [s.ruleId, s]));

	const result = rules.map((r) => {
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

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const projectId = event.params.projectId;
	const body = await event.request.json();

	const error = validateRule(body);
	if (error) {
		return json({ error }, { status: 400 });
	}

	const now = Date.now();
	const id = nanoid(12);

	const rule = {
		id,
		projectId,
		name: body.name.trim(),
		description: body.description?.trim() || null,
		trigger: JSON.stringify(body.trigger),
		conditions: body.conditions ? JSON.stringify(body.conditions) : null,
		actions: JSON.stringify(body.actions),
		enabled: body.enabled !== false,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(automationRules).values(rule).run();
	broadcastAutomationChanged(event.params.projectId, user.id);

	return json({
		...rule,
		trigger: body.trigger,
		conditions: body.conditions || null,
		actions: body.actions
	}, { status: 201 });
};
