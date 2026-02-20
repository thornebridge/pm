import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProposals, crmProposalItems } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

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

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { proposalId, itemId } = event.params;

	const proposal = db
		.select()
		.from(crmProposals)
		.where(eq(crmProposals.id, proposalId))
		.get();
	if (!proposal) return json({ error: 'Proposal not found' }, { status: 404 });
	if (proposal.status !== 'draft') {
		return json({ error: 'Can only edit items on draft proposals' }, { status: 400 });
	}

	const existing = db
		.select()
		.from(crmProposalItems)
		.where(
			and(
				eq(crmProposalItems.id, itemId),
				eq(crmProposalItems.proposalId, proposalId)
			)
		)
		.get();
	if (!existing) return json({ error: 'Item not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = {};

	const fields = [
		'productName', 'productSku', 'description', 'quantity', 'unitAmount',
		'discountPercent', 'discountAmount', 'setupFee', 'billingModel',
		'billingInterval', 'position'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	// Recompute lineTotal
	const merged = { ...existing, ...updates };
	updates.lineTotal = computeLineTotal({
		quantity: merged.quantity as number,
		unitAmount: merged.unitAmount as number,
		discountPercent: merged.discountPercent as number | null,
		discountAmount: merged.discountAmount as number | null,
		setupFee: merged.setupFee as number | null
	});

	db.update(crmProposalItems).set(updates).where(eq(crmProposalItems.id, itemId)).run();
	updateProposalAmount(proposalId);

	const updated = db.select().from(crmProposalItems).where(eq(crmProposalItems.id, itemId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { proposalId, itemId } = event.params;

	const proposal = db
		.select()
		.from(crmProposals)
		.where(eq(crmProposals.id, proposalId))
		.get();
	if (!proposal) return json({ error: 'Proposal not found' }, { status: 404 });
	if (proposal.status !== 'draft') {
		return json({ error: 'Can only remove items from draft proposals' }, { status: 400 });
	}

	const existing = db
		.select()
		.from(crmProposalItems)
		.where(
			and(
				eq(crmProposalItems.id, itemId),
				eq(crmProposalItems.proposalId, proposalId)
			)
		)
		.get();
	if (!existing) return json({ error: 'Item not found' }, { status: 404 });

	db.delete(crmProposalItems).where(eq(crmProposalItems.id, itemId)).run();
	updateProposalAmount(proposalId);

	return json({ ok: true });
};
