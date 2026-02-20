import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finBudgets } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	const budget = db
		.select()
		.from(finBudgets)
		.where(eq(finBudgets.id, event.params.budgetId))
		.get();

	if (!budget) {
		return json({ error: 'Budget not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.amount !== undefined) updates.amount = body.amount;
	if (body.notes !== undefined) updates.notes = body.notes || null;
	if (body.periodStart !== undefined) updates.periodStart = body.periodStart;
	if (body.periodEnd !== undefined) updates.periodEnd = body.periodEnd;

	db.update(finBudgets)
		.set(updates)
		.where(eq(finBudgets.id, event.params.budgetId))
		.run();

	const updated = db.select().from(finBudgets).where(eq(finBudgets.id, event.params.budgetId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	const budget = db
		.select()
		.from(finBudgets)
		.where(eq(finBudgets.id, event.params.budgetId))
		.get();

	if (!budget) {
		return json({ error: 'Budget not found' }, { status: 404 });
	}

	db.delete(finBudgets)
		.where(eq(finBudgets.id, event.params.budgetId))
		.run();

	return json({ success: true });
};
