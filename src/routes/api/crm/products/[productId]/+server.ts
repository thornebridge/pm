import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers, crmPriceBrackets, crmOpportunityItems } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const [product] = await db.select().from(crmProducts).where(eq(crmProducts.id, productId));
	if (!product) return json({ error: 'Product not found' }, { status: 404 });

	const tiers = await db
		.select()
		.from(crmPriceTiers)
		.where(eq(crmPriceTiers.productId, productId))
		.orderBy(asc(crmPriceTiers.position));

	const tiersWithBrackets = [];
	for (const tier of tiers) {
		const brackets = await db
			.select()
			.from(crmPriceBrackets)
			.where(eq(crmPriceBrackets.priceTierId, tier.id))
			.orderBy(asc(crmPriceBrackets.position));
		tiersWithBrackets.push({ ...tier, brackets });
	}

	return json({ ...product, tiers: tiersWithBrackets });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const [existing] = await db.select().from(crmProducts).where(eq(crmProducts.id, productId));
	if (!existing) return json({ error: 'Product not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = ['name', 'sku', 'description', 'category', 'type', 'status', 'taxable'];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	await db.update(crmProducts).set(updates).where(eq(crmProducts.id, productId));
	const [updated] = await db.select().from(crmProducts).where(eq(crmProducts.id, productId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const [existing] = await db.select().from(crmProducts).where(eq(crmProducts.id, productId));
	if (!existing) return json({ error: 'Product not found' }, { status: 404 });

	// Check if referenced in any opportunity items — archive instead of delete
	const refs = await db
		.select({ id: crmOpportunityItems.id })
		.from(crmOpportunityItems)
		.where(eq(crmOpportunityItems.productId, productId))
		.limit(1);

	if (refs.length > 0) {
		await db.update(crmProducts)
			.set({ status: 'archived', updatedAt: Date.now() })
			.where(eq(crmProducts.id, productId));
		return json({ ok: true, archived: true });
	}

	await db.delete(crmProducts).where(eq(crmProducts.id, productId));
	return json({ ok: true });
};
