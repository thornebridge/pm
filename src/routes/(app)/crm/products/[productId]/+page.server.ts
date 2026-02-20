import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers, crmPriceBrackets } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const product = db
		.select()
		.from(crmProducts)
		.where(eq(crmProducts.id, params.productId))
		.get();
	if (!product) throw error(404, 'Product not found');

	const tiers = db
		.select()
		.from(crmPriceTiers)
		.where(eq(crmPriceTiers.productId, params.productId))
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

	return { product, tiers: tiersWithBrackets };
};
