import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers, crmPriceBrackets } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId } = event.params;

	const [product] = await db.select().from(crmProducts).where(eq(crmProducts.id, productId));
	if (!product) return json({ error: 'Product not found' }, { status: 404 });

	const body = await event.request.json();
	if (!body.name?.trim()) {
		return json({ error: 'Tier name is required' }, { status: 400 });
	}

	// Get next position
	const [maxPos] = await db
		.select({ max: sql<number>`COALESCE(MAX(position), -1)` })
		.from(crmPriceTiers)
		.where(eq(crmPriceTiers.productId, productId));

	const now = Date.now();
	const tierId = nanoid(12);
	const tier = {
		id: tierId,
		productId,
		name: body.name.trim(),
		billingModel: body.billingModel || 'one_time',
		unitAmount: body.unitAmount ?? null,
		currency: body.currency || 'USD',
		billingInterval: body.billingInterval || null,
		setupFee: body.setupFee ?? null,
		trialDays: body.trialDays ?? null,
		unitLabel: body.unitLabel || null,
		minQuantity: body.minQuantity ?? null,
		maxQuantity: body.maxQuantity ?? null,
		isDefault: body.isDefault ?? false,
		position: (maxPos?.max ?? -1) + 1,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmPriceTiers).values(tier);

	// Insert brackets if provided
	if (Array.isArray(body.brackets)) {
		for (let i = 0; i < body.brackets.length; i++) {
			const b = body.brackets[i];
			await db.insert(crmPriceBrackets)
				.values({
					id: nanoid(12),
					priceTierId: tierId,
					minUnits: b.minUnits,
					maxUnits: b.maxUnits ?? null,
					unitAmount: b.unitAmount,
					flatAmount: b.flatAmount ?? null,
					position: i
				});
		}
	}

	return json(tier, { status: 201 });
};
