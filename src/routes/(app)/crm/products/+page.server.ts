import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers } from '$lib/server/db/schema.js';
import { asc, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	await parent();

	const products = db
		.select()
		.from(crmProducts)
		.orderBy(asc(crmProducts.name))
		.all();

	const enriched = products.map((p) => {
		const tierInfo = db
			.select({
				count: sql<number>`COUNT(*)`,
				defaultPrice: sql<number | null>`MAX(CASE WHEN is_default = 1 THEN unit_amount ELSE NULL END)`
			})
			.from(crmPriceTiers)
			.where(eq(crmPriceTiers.productId, p.id))
			.get();

		// If no default tier, get first tier's price
		let defaultPrice = tierInfo?.defaultPrice ?? null;
		if (defaultPrice === null) {
			const first = db
				.select({ unitAmount: crmPriceTiers.unitAmount })
				.from(crmPriceTiers)
				.where(eq(crmPriceTiers.productId, p.id))
				.orderBy(asc(crmPriceTiers.position))
				.limit(1)
				.get();
			defaultPrice = first?.unitAmount ?? null;
		}

		return {
			...p,
			tierCount: tierInfo?.count ?? 0,
			defaultPrice
		};
	});

	return { products: enriched };
};
