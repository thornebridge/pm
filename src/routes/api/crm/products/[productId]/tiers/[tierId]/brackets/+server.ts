import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmPriceTiers, crmPriceBrackets } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const PUT: RequestHandler = async (event) => {
	requireAuth(event);
	const { productId, tierId } = event.params;

	const [tier] = await db
		.select()
		.from(crmPriceTiers)
		.where(and(eq(crmPriceTiers.id, tierId), eq(crmPriceTiers.productId, productId)));
	if (!tier) return json({ error: 'Price tier not found' }, { status: 404 });

	const body = await event.request.json();
	if (!Array.isArray(body.brackets)) {
		return json({ error: 'brackets array is required' }, { status: 400 });
	}

	// Delete existing brackets and re-insert
	await db.delete(crmPriceBrackets).where(eq(crmPriceBrackets.priceTierId, tierId));

	const brackets = [];
	for (let i = 0; i < body.brackets.length; i++) {
		const b = body.brackets[i];
		const bracket = {
			id: nanoid(12),
			priceTierId: tierId,
			minUnits: b.minUnits,
			maxUnits: b.maxUnits ?? null,
			unitAmount: b.unitAmount,
			flatAmount: b.flatAmount ?? null,
			position: i
		};
		await db.insert(crmPriceBrackets).values(bracket);
		brackets.push(bracket);
	}

	return json({ brackets });
};
