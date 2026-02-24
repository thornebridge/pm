import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { automationRules, automationExecutions } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { validateRule } from '$lib/server/automations/validate.js';
import { broadcastAutomationChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const ruleId = event.params.ruleId;

	const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, ruleId));
	if (!rule) {
		return json({ error: 'Automation rule not found' }, { status: 404 });
	}

	const executionsRaw = await db
		.select()
		.from(automationExecutions)
		.where(eq(automationExecutions.ruleId, ruleId))
		.orderBy(desc(automationExecutions.createdAt))
		.limit(50);

	const executions = executionsRaw.map((e) => ({
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
	const user = requireAuth(event);
	const ruleId = event.params.ruleId;
	const body = await event.request.json();

	const [existing] = await db.select().from(automationRules).where(eq(automationRules.id, ruleId));
	if (!existing) {
		return json({ error: 'Automation rule not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	// Simple toggle — just enable/disable
	if (Object.keys(body).length === 1 && body.enabled !== undefined) {
		updates.enabled = body.enabled;
	} else {
		// Full update — validate the whole rule
		const merged = {
			name: body.name ?? existing.name,
			trigger: body.trigger ?? JSON.parse(existing.trigger),
			conditions: body.conditions !== undefined ? body.conditions : (existing.conditions ? JSON.parse(existing.conditions) : null),
			actions: body.actions ?? JSON.parse(existing.actions)
		};

		const error = validateRule(merged);
		if (error) {
			return json({ error }, { status: 400 });
		}

		if (body.name !== undefined) updates.name = body.name.trim();
		if (body.description !== undefined) updates.description = body.description?.trim() || null;
		if (body.trigger !== undefined) updates.trigger = JSON.stringify(body.trigger);
		if (body.conditions !== undefined) updates.conditions = body.conditions ? JSON.stringify(body.conditions) : null;
		if (body.actions !== undefined) updates.actions = JSON.stringify(body.actions);
		if (body.enabled !== undefined) updates.enabled = body.enabled;
	}

	await db.update(automationRules).set(updates).where(eq(automationRules.id, ruleId));

	const [updated] = await db.select().from(automationRules).where(eq(automationRules.id, ruleId));
	broadcastAutomationChanged(event.params.projectId, user.id);

	return json({
		...updated,
		trigger: JSON.parse(updated!.trigger),
		conditions: updated!.conditions ? JSON.parse(updated!.conditions) : null,
		actions: JSON.parse(updated!.actions)
	});
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const ruleId = event.params.ruleId;

	const [existing] = await db.select().from(automationRules).where(eq(automationRules.id, ruleId));
	if (!existing) {
		return json({ error: 'Automation rule not found' }, { status: 404 });
	}

	await db.delete(automationRules).where(eq(automationRules.id, ruleId));
	broadcastAutomationChanged(event.params.projectId, user.id);

	return json({ ok: true });
};
