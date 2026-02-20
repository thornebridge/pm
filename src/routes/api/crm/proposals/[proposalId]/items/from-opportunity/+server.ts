import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmProposals,
	crmProposalItems,
	crmOpportunityItems,
	crmProducts
} from '$lib/server/db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { proposalId } = event.params;

	const proposal = db
		.select()
		.from(crmProposals)
		.where(eq(crmProposals.id, proposalId))
		.get();
	if (!proposal) return json({ error: 'Proposal not found' }, { status: 404 });
	if (proposal.status !== 'draft') {
		return json({ error: 'Can only import items to draft proposals' }, { status: 400 });
	}

	// Get opportunity items with product info
	const oppItems = db
		.select({
			id: crmOpportunityItems.id,
			productId: crmOpportunityItems.productId,
			description: crmOpportunityItems.description,
			quantity: crmOpportunityItems.quantity,
			unitAmount: crmOpportunityItems.unitAmount,
			discountPercent: crmOpportunityItems.discountPercent,
			discountAmount: crmOpportunityItems.discountAmount,
			setupFee: crmOpportunityItems.setupFee,
			billingModel: crmOpportunityItems.billingModel,
			billingInterval: crmOpportunityItems.billingInterval,
			position: crmOpportunityItems.position,
			productName: crmProducts.name,
			productSku: crmProducts.sku
		})
		.from(crmOpportunityItems)
		.innerJoin(crmProducts, eq(crmOpportunityItems.productId, crmProducts.id))
		.where(eq(crmOpportunityItems.opportunityId, proposal.opportunityId))
		.orderBy(asc(crmOpportunityItems.position))
		.all();

	if (oppItems.length === 0) {
		return json({ error: 'No items on this opportunity to import' }, { status: 400 });
	}

	// Delete existing proposal items first (replace)
	db.delete(crmProposalItems).where(eq(crmProposalItems.proposalId, proposalId)).run();

	const now = Date.now();
	const created = [];

	for (let i = 0; i < oppItems.length; i++) {
		const oi = oppItems[i];
		let lineTotal = Math.round(oi.quantity * oi.unitAmount);
		if (oi.discountPercent) {
			lineTotal = Math.round(lineTotal * (1 - oi.discountPercent / 100));
		} else if (oi.discountAmount) {
			lineTotal = lineTotal - oi.discountAmount;
		}
		lineTotal += oi.setupFee ?? 0;
		lineTotal = Math.max(0, lineTotal);

		const item = {
			id: nanoid(12),
			proposalId,
			opportunityItemId: oi.id,
			productName: oi.productName,
			productSku: oi.productSku,
			description: oi.description,
			quantity: oi.quantity,
			unitAmount: oi.unitAmount,
			discountPercent: oi.discountPercent,
			discountAmount: oi.discountAmount,
			setupFee: oi.setupFee,
			billingModel: oi.billingModel,
			billingInterval: oi.billingInterval,
			lineTotal,
			position: i,
			createdAt: now
		};

		db.insert(crmProposalItems).values(item).run();
		created.push(item);
	}

	// Update proposal amount
	const total = created.reduce((sum, item) => sum + item.lineTotal, 0);
	db.update(crmProposals)
		.set({ amount: total, updatedAt: Date.now() })
		.where(eq(crmProposals.id, proposalId))
		.run();

	return json({ items: created, total }, { status: 201 });
};
