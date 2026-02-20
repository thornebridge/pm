import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalLines, finJournalEntries } from '$lib/server/db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { getAccountBalance } from '$lib/server/financials/balance.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { accountId } = event.params;

	const account = db.select().from(finAccounts).where(eq(finAccounts.id, accountId)).get();
	if (!account) return json({ error: 'Account not found' }, { status: 404 });

	const balance = getAccountBalance(accountId);

	return json({ ...account, balance });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { accountId } = event.params;

	const existing = db.select().from(finAccounts).where(eq(finAccounts.id, accountId)).get();
	if (!existing) return json({ error: 'Account not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	// Prevent changing accountNumber or accountType on system accounts
	if (existing.isSystem) {
		if ('accountNumber' in body || 'accountType' in body) {
			return json(
				{ error: 'Cannot update accountNumber or accountType on system accounts' },
				{ status: 403 }
			);
		}
	}

	const allowedFields = ['name', 'description', 'subtype', 'parentId', 'active', 'currency'];
	for (const f of allowedFields) {
		if (f in body) updates[f] = body[f];
	}

	if ('name' in body && !body.name?.trim()) {
		return json({ error: 'name cannot be empty' }, { status: 400 });
	}

	db.update(finAccounts).set(updates).where(eq(finAccounts.id, accountId)).run();
	const updated = db.select().from(finAccounts).where(eq(finAccounts.id, accountId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { accountId } = event.params;

	const existing = db.select().from(finAccounts).where(eq(finAccounts.id, accountId)).get();
	if (!existing) return json({ error: 'Account not found' }, { status: 404 });

	// Reject if account has any posted journal lines
	const postedLineCount = db
		.select({ n: count() })
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(
			and(
				eq(finJournalLines.accountId, accountId),
				eq(finJournalEntries.status, 'posted')
			)
		)
		.get();

	if (postedLineCount && postedLineCount.n > 0) {
		return json(
			{ error: 'Cannot deactivate account with posted journal entries' },
			{ status: 409 }
		);
	}

	// Soft-deactivate
	db.update(finAccounts)
		.set({ active: false, updatedAt: Date.now() })
		.where(eq(finAccounts.id, accountId))
		.run();

	return json({ ok: true });
};
