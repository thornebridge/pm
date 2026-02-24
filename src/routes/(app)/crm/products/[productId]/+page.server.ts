import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers, crmPriceBrackets } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const [product] = await db
		.select()
		.from(crmProducts)
		.where(eq(crmProducts.id, params.productId));
	if (!product) throw error(404, 'Product not found');

	const tiers = await db
		.select()
		.from(crmPriceTiers)
		.where(eq(crmPriceTiers.productId, params.productId))
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

	return { product, tiers: tiersWithBrackets };
};
