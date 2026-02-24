import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmPriceTiers } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId, tierId } = event.params;

	const [existing] = await db
		.select()
		.from(crmPriceTiers)
		.where(and(eq(crmPriceTiers.id, tierId), eq(crmPriceTiers.productId, productId)));
	if (!existing) return json({ error: 'Price tier not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'name', 'billingModel', 'unitAmount', 'currency', 'billingInterval',
		'setupFee', 'trialDays', 'unitLabel', 'minQuantity', 'maxQuantity',
		'isDefault', 'position'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	await db.update(crmPriceTiers).set(updates).where(eq(crmPriceTiers.id, tierId));
	const [updated] = await db.select().from(crmPriceTiers).where(eq(crmPriceTiers.id, tierId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId, tierId } = event.params;

	const [existing] = await db
		.select()
		.from(crmPriceTiers)
		.where(and(eq(crmPriceTiers.id, tierId), eq(crmPriceTiers.productId, productId)));
	if (!existing) return json({ error: 'Price tier not found' }, { status: 404 });

	await db.delete(crmPriceTiers).where(eq(crmPriceTiers.id, tierId));
	return json({ ok: true });
};
