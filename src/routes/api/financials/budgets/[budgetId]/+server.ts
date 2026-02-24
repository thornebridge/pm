import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finBudgets } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	const [budget] = await db
		.select()
		.from(finBudgets)
		.where(eq(finBudgets.id, event.params.budgetId));

	if (!budget) {
		return json({ error: 'Budget not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.amount !== undefined) updates.amount = body.amount;
	if (body.notes !== undefined) updates.notes = body.notes || null;
	if (body.periodStart !== undefined) updates.periodStart = body.periodStart;
	if (body.periodEnd !== undefined) updates.periodEnd = body.periodEnd;

	await db.update(finBudgets)
		.set(updates)
		.where(eq(finBudgets.id, event.params.budgetId));

	const [updated] = await db.select().from(finBudgets).where(eq(finBudgets.id, event.params.budgetId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	const [budget] = await db
		.select()
		.from(finBudgets)
		.where(eq(finBudgets.id, event.params.budgetId));

	if (!budget) {
		return json({ error: 'Budget not found' }, { status: 404 });
	}

	await db.delete(finBudgets)
		.where(eq(finBudgets.id, event.params.budgetId));

	return json({ success: true });
};
