import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers, crmPriceBrackets, crmOpportunityItems } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const product = db.select().from(crmProducts).where(eq(crmProducts.id, productId)).get();
	if (!product) return json({ error: 'Product not found' }, { status: 404 });

	const tiers = db
		.select()
		.from(crmPriceTiers)
		.where(eq(crmPriceTiers.productId, productId))
		.orderBy(asc(crmPriceTiers.position))
		.all();

	const tiersWithBrackets = tiers.map((tier) => {
		const brackets = db
			.select()
			.from(crmPriceBrackets)
			.where(eq(crmPriceBrackets.priceTierId, tier.id))
			.orderBy(asc(crmPriceBrackets.position))
			.all();
		return { ...tier, brackets };
	});

	return json({ ...product, tiers: tiersWithBrackets });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const existing = db.select().from(crmProducts).where(eq(crmProducts.id, productId)).get();
	if (!existing) return json({ error: 'Product not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = ['name', 'sku', 'description', 'category', 'type', 'status', 'taxable'];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	db.update(crmProducts).set(updates).where(eq(crmProducts.id, productId)).run();
	const updated = db.select().from(crmProducts).where(eq(crmProducts.id, productId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const existing = db.select().from(crmProducts).where(eq(crmProducts.id, productId)).get();
	if (!existing) return json({ error: 'Product not found' }, { status: 404 });

	// Check if referenced in any opportunity items — archive instead of delete
	const refs = db
		.select({ id: crmOpportunityItems.id })
		.from(crmOpportunityItems)
		.where(eq(crmOpportunityItems.productId, productId))
		.limit(1)
		.all();

	if (refs.length > 0) {
		db.update(crmProducts)
			.set({ status: 'archived', updatedAt: Date.now() })
			.where(eq(crmProducts.id, productId))
			.run();
		return json({ ok: true, archived: true });
	}

	db.delete(crmProducts).where(eq(crmProducts.id, productId)).run();
	return json({ ok: true });
};
