import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finRecurringRules } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const [rule] = await db
		.select()
		.from(finRecurringRules)
		.where(eq(finRecurringRules.id, event.params.ruleId));

	if (!rule) {
		return json({ error: 'Rule not found' }, { status: 404 });
	}

	return json(rule);
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	const [rule] = await db
		.select()
		.from(finRecurringRules)
		.where(eq(finRecurringRules.id, event.params.ruleId));

	if (!rule) {
		return json({ error: 'Rule not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.name !== undefined) updates.name = body.name.trim();
	if (body.description !== undefined) updates.description = body.description || null;
	if (body.frequency !== undefined) updates.frequency = body.frequency;
	if (body.endDate !== undefined) updates.endDate = body.endDate || null;
	if (body.autoPost !== undefined) updates.autoPost = body.autoPost;
	if (body.status !== undefined) updates.status = body.status;
	if (body.templateDescription !== undefined) updates.templateDescription = body.templateDescription.trim();
	if (body.templateLines !== undefined) {
		const lines = typeof body.templateLines === 'string' ? JSON.parse(body.templateLines) : body.templateLines;
		updates.templateLines = JSON.stringify(lines);
	}

	await db.update(finRecurringRules)
		.set(updates)
		.where(eq(finRecurringRules.id, event.params.ruleId));

	const [updated] = await db.select().from(finRecurringRules).where(eq(finRecurringRules.id, event.params.ruleId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	const [rule] = await db
		.select()
		.from(finRecurringRules)
		.where(eq(finRecurringRules.id, event.params.ruleId));

	if (!rule) {
		return json({ error: 'Rule not found' }, { status: 404 });
	}

	await db.delete(finRecurringRules)
		.where(eq(finRecurringRules.id, event.params.ruleId));

	return json({ success: true });
};
