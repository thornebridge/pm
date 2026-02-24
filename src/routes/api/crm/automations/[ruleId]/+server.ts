import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmAutomationRules, crmAutomationExecutions } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { validateCrmRule } from '$lib/server/crm-automations/validate.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { ruleId } = event.params;

	const rule = db.select().from(crmAutomationRules).where(eq(crmAutomationRules.id, ruleId)).get();
	if (!rule) return json({ error: 'Rule not found' }, { status: 404 });

	const executions = db.select().from(crmAutomationExecutions)
		.where(eq(crmAutomationExecutions.ruleId, ruleId))
		.orderBy(desc(crmAutomationExecutions.createdAt))
		.limit(50)
		.all()
		.map((e) => ({
			...e,
			actionsRun: e.actionsRun ? JSON.parse(e.actionsRun) : []
		}));

	return json({
		...rule,
		trigger: JSON.parse(rule.trigger),
		conditions: rule.conditions ? JSON.parse(rule.conditions) : null,
		actions: JSON.parse(rule.actions),
		executions
	});
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { ruleId } = event.params;

	const existing = db.select().from(crmAutomationRules).where(eq(crmAutomationRules.id, ruleId)).get();
	if (!existing) return json({ error: 'Rule not found' }, { status: 404 });

	const body = await event.request.json();

	// Simple toggle
	if (Object.keys(body).length === 1 && 'enabled' in body) {
		db.update(crmAutomationRules)
			.set({ enabled: body.enabled, updatedAt: Date.now() })
			.where(eq(crmAutomationRules.id, ruleId))
			.run();
		const updated = db.select().from(crmAutomationRules).where(eq(crmAutomationRules.id, ruleId)).get()!;
		return json({
			...updated,
			trigger: JSON.parse(updated.trigger),
			conditions: updated.conditions ? JSON.parse(updated.conditions) : null,
			actions: JSON.parse(updated.actions)
		});
	}

	// Full update
	const error = validateCrmRule(body);
	if (error) return json({ error }, { status: 400 });

	db.update(crmAutomationRules)
		.set({
			name: body.name.trim(),
			description: body.description?.trim() || null,
			entityType: body.entityType || existing.entityType,
			trigger: JSON.stringify(body.trigger),
			conditions: body.conditions ? JSON.stringify(body.conditions) : null,
			actions: JSON.stringify(body.actions),
			enabled: body.enabled !== false,
			updatedAt: Date.now()
		})
		.where(eq(crmAutomationRules.id, ruleId))
		.run();

	const updated = db.select().from(crmAutomationRules).where(eq(crmAutomationRules.id, ruleId)).get()!;
	return json({
		...updated,
		trigger: JSON.parse(updated.trigger),
		conditions: updated.conditions ? JSON.parse(updated.conditions) : null,
		actions: JSON.parse(updated.actions)
	});
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { ruleId } = event.params;

	db.delete(crmAutomationRules).where(eq(crmAutomationRules.id, ruleId)).run();
	return json({ ok: true });
};
