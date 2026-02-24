import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { entryId } = event.params;

	const [entry] = await db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	if (!entry) return json({ error: 'Journal entry not found' }, { status: 404 });

	if (entry.status !== 'draft') {
		return json({ error: 'Only draft entries can be posted' }, { status: 400 });
	}

	// Re-validate that lines balance
	const [totals] = await db
		.select({
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`,
			lineCount: sql<number>`count(*)`
		})
		.from(finJournalLines)
		.where(eq(finJournalLines.journalEntryId, entryId));

	if (!totals || totals.lineCount < 2) {
		return json({ error: 'Entry must have at least 2 lines' }, { status: 400 });
	}

	if (totals.totalDebit !== totals.totalCredit) {
		return json({ error: `Debits (${totals.totalDebit}) must equal credits (${totals.totalCredit})` }, { status: 400 });
	}

	const now = Date.now();
	await db.update(finJournalEntries)
		.set({ status: 'posted', updatedAt: now })
		.where(eq(finJournalEntries.id, entryId));

	const [updated] = await db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	return json(updated);
};
