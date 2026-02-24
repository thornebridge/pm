import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers } from '$lib/server/db/schema.js';
import { asc, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	await parent();

	const products = await db
		.select()
		.from(crmProducts)
		.orderBy(asc(crmProducts.name));

	const enriched = [];
	for (const p of products) {
		const [tierInfo] = await db
			.select({
				count: sql<number>`COUNT(*)`,
				defaultPrice: sql<number | null>`MAX(CASE WHEN is_default = true THEN unit_amount ELSE NULL END)`
			})
			.from(crmPriceTiers)
			.where(eq(crmPriceTiers.productId, p.id));

		// If no default tier, get first tier's price
		let defaultPrice = tierInfo?.defaultPrice ?? null;
		if (defaultPrice === null) {
			const [first] = await db
				.select({ unitAmount: crmPriceTiers.unitAmount })
				.from(crmPriceTiers)
				.where(eq(crmPriceTiers.productId, p.id))
				.orderBy(asc(crmPriceTiers.position))
				.limit(1);
			defaultPrice = first?.unitAmount ?? null;
		}

		enriched.push({
			...p,
			tierCount: tierInfo?.count ?? 0,
			defaultPrice
		});
	}

	return { products: enriched };
};
