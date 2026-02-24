import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finReconciliations, finJournalLines, finJournalEntries, finAccounts } from '$lib/server/db/schema.js';
import { eq, and, lte } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const [recon] = await db
		.select()
		.from(finReconciliations)
		.where(eq(finReconciliations.id, event.params.reconId));

	if (!recon) {
		return json({ error: 'Reconciliation not found' }, { status: 404 });
	}

	// Get all unreconciled posted journal lines for this bank account up to statement date
	const lines = await db
		.select({
			lineId: finJournalLines.id,
			journalEntryId: finJournalLines.journalEntryId,
			entryNumber: finJournalEntries.entryNumber,
			date: finJournalEntries.date,
			description: finJournalEntries.description,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit,
			reconciled: finJournalLines.reconciled,
			memo: finJournalLines.memo
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(
			and(
				eq(finJournalLines.accountId, recon.bankAccountId),
				eq(finJournalEntries.status, 'posted'),
				lte(finJournalEntries.date, recon.statementDate)
			)
		);

	return json({ ...recon, lines });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	const [recon] = await db
		.select()
		.from(finReconciliations)
		.where(eq(finReconciliations.id, event.params.reconId));

	if (!recon) {
		return json({ error: 'Reconciliation not found' }, { status: 404 });
	}

	if (recon.status === 'completed') {
		return json({ error: 'Reconciliation already completed' }, { status: 400 });
	}

	// Toggle reconciled status on specified lines
	if (body.lineIds && Array.isArray(body.lineIds)) {
		const now = Date.now();
		for (const lineId of body.lineIds) {
			const [line] = await db
				.select({ reconciled: finJournalLines.reconciled })
				.from(finJournalLines)
				.where(eq(finJournalLines.id, lineId));

			if (line) {
				await db.update(finJournalLines)
					.set({
						reconciled: !line.reconciled,
						reconciledAt: !line.reconciled ? now : null
					})
					.where(eq(finJournalLines.id, lineId));
			}
		}
	}

	return json({ success: true });
};
