import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProposals } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { proposalId } = event.params;

	const [existing] = await db.select().from(crmProposals).where(eq(crmProposals.id, proposalId));
	if (!existing) return json({ error: 'Proposal not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	// Handle status transitions (always allowed)
	if ('status' in body) {
		const newStatus = body.status;
		updates.status = newStatus;

		if (newStatus === 'sent' && !existing.sentAt) {
			updates.sentAt = Date.now();
		}
		if ((newStatus === 'accepted' || newStatus === 'rejected') && !existing.respondedAt) {
			updates.respondedAt = Date.now();
		}
	}

	// Field edits only allowed on draft proposals
	const fields = ['title', 'description', 'amount', 'expiresAt'];
	for (const f of fields) {
		if (f in body) {
			if (existing.status !== 'draft' && !('status' in body)) {
				return json({ error: 'Can only edit draft proposals' }, { status: 400 });
			}
			updates[f] = body[f];
		}
	}

	await db.update(crmProposals).set(updates).where(eq(crmProposals.id, proposalId));
	const [updated] = await db.select().from(crmProposals).where(eq(crmProposals.id, proposalId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { proposalId } = event.params;

	const [existing] = await db.select().from(crmProposals).where(eq(crmProposals.id, proposalId));
	if (!existing) return json({ error: 'Proposal not found' }, { status: 404 });

	await db.delete(crmProposals).where(eq(crmProposals.id, proposalId));
	return json({ ok: true });
};
