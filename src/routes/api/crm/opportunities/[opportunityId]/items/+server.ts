import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmOpportunityItems,
	crmProducts,
	crmPriceTiers
} from '$lib/server/db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const items = db
		.select({
			id: crmOpportunityItems.id,
			opportunityId: crmOpportunityItems.opportunityId,
			productId: crmOpportunityItems.productId,
			priceTierId: crmOpportunityItems.priceTierId,
			description: crmOpportunityItems.description,
			quantity: crmOpportunityItems.quantity,
			unitAmount: crmOpportunityItems.unitAmount,
			discountPercent: crmOpportunityItems.discountPercent,
			discountAmount: crmOpportunityItems.discountAmount,
			setupFee: crmOpportunityItems.setupFee,
			billingModel: crmOpportunityItems.billingModel,
			billingInterval: crmOpportunityItems.billingInterval,
			position: crmOpportunityItems.position,
			createdAt: crmOpportunityItems.createdAt,
			productName: crmProducts.name,
			productSku: crmProducts.sku
		})
		.from(crmOpportunityItems)
		.innerJoin(crmProducts, eq(crmOpportunityItems.productId, crmProducts.id))
		.where(eq(crmOpportunityItems.opportunityId, opportunityId))
		.orderBy(asc(crmOpportunityItems.position))
		.all();

	return json(items);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const opp = db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId))
		.get();
	if (!opp) return json({ error: 'Opportunity not found' }, { status: 404 });

	const body = await event.request.json();
	if (!body.productId) {
		return json({ error: 'productId is required' }, { status: 400 });
	}

	const product = db
		.select()
		.from(crmProducts)
		.where(eq(crmProducts.id, body.productId))
		.get();
	if (!product) return json({ error: 'Product not found' }, { status: 404 });

	// If a priceTierId is given, copy defaults from it
	let tier = null;
	if (body.priceTierId) {
		tier = db
			.select()
			.from(crmPriceTiers)
			.where(eq(crmPriceTiers.id, body.priceTierId))
			.get();
	}

	// Get next position
	const maxPos = db
		.select({ max: sql<number>`COALESCE(MAX(position), -1)` })
		.from(crmOpportunityItems)
		.where(eq(crmOpportunityItems.opportunityId, opportunityId))
		.get();

	const now = Date.now();
	const item = {
		id: nanoid(12),
		opportunityId,
		productId: body.productId,
		priceTierId: body.priceTierId || null,
		description: body.description || product.description || null,
		quantity: body.quantity ?? 1,
		unitAmount: body.unitAmount ?? tier?.unitAmount ?? 0,
		discountPercent: body.discountPercent ?? null,
		discountAmount: body.discountAmount ?? null,
		setupFee: body.setupFee ?? tier?.setupFee ?? null,
		billingModel: body.billingModel ?? tier?.billingModel ?? 'one_time',
		billingInterval: body.billingInterval ?? tier?.billingInterval ?? null,
		position: (maxPos?.max ?? -1) + 1,
		createdAt: now,
		updatedAt: now
	};

	db.insert(crmOpportunityItems).values(item).run();
	return json({ ...item, productName: product.name, productSku: product.sku }, { status: 201 });
};
