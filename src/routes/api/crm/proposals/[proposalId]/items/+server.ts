import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProposals, crmProposalItems } from '$lib/server/db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { proposalId } = event.params;

	const items = db
		.select()
		.from(crmProposalItems)
		.where(eq(crmProposalItems.proposalId, proposalId))
		.orderBy(asc(crmProposalItems.position))
		.all();

	return json(items);
};

function computeLineTotal(item: {
	quantity: number;
	unitAmount: number;
	discountPercent?: number | null;
	discountAmount?: number | null;
	setupFee?: number | null;
}) {
	let subtotal = Math.round(item.quantity * item.unitAmount);
	if (item.discountPercent) {
		subtotal = Math.round(subtotal * (1 - item.discountPercent / 100));
	} else if (item.discountAmount) {
		subtotal = subtotal - item.discountAmount;
	}
	subtotal += item.setupFee ?? 0;
	return Math.max(0, subtotal);
}

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
		return json({ error: 'Can only add items to draft proposals' }, { status: 400 });
	}

	const body = await event.request.json();
	if (!body.productName?.trim()) {
		return json({ error: 'productName is required' }, { status: 400 });
	}

	const maxPos = db
		.select({ max: sql<number>`COALESCE(MAX(position), -1)` })
		.from(crmProposalItems)
		.where(eq(crmProposalItems.proposalId, proposalId))
		.get();

	const now = Date.now();
	const lineTotal = computeLineTotal({
		quantity: body.quantity ?? 1,
		unitAmount: body.unitAmount ?? 0,
		discountPercent: body.discountPercent,
		discountAmount: body.discountAmount,
		setupFee: body.setupFee
	});

	const item = {
		id: nanoid(12),
		proposalId,
		opportunityItemId: body.opportunityItemId || null,
		productName: body.productName.trim(),
		productSku: body.productSku || null,
		description: body.description || null,
		quantity: body.quantity ?? 1,
		unitAmount: body.unitAmount ?? 0,
		discountPercent: body.discountPercent ?? null,
		discountAmount: body.discountAmount ?? null,
		setupFee: body.setupFee ?? null,
		billingModel: body.billingModel || null,
		billingInterval: body.billingInterval || null,
		lineTotal,
		position: (maxPos?.max ?? -1) + 1,
		createdAt: now
	};

	db.insert(crmProposalItems).values(item).run();

	// Update proposal amount
	updateProposalAmount(proposalId);

	return json(item, { status: 201 });
};

function updateProposalAmount(proposalId: string) {
	const result = db
		.select({ total: sql<number>`COALESCE(SUM(line_total), 0)` })
		.from(crmProposalItems)
		.where(eq(crmProposalItems.proposalId, proposalId))
		.get();

	db.update(crmProposals)
		.set({ amount: result?.total ?? 0, updatedAt: Date.now() })
		.where(eq(crmProposals.id, proposalId))
		.run();
}
