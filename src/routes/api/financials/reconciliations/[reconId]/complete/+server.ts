import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finReconciliations, finJournalLines, finJournalEntries, finBankAccountMeta } from '$lib/server/db/schema.js';
import { eq, and, lte, sql } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	requireAuth(event);

	const recon = db
		.select()
		.from(finReconciliations)
		.where(eq(finReconciliations.id, event.params.reconId))
		.get();

	if (!recon) {
		return json({ error: 'Reconciliation not found' }, { status: 404 });
	}

	if (recon.status === 'completed') {
		return json({ error: 'Already completed' }, { status: 400 });
	}

	// Compute reconciled balance: sum of reconciled lines
	const result = db
		.select({
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(
			and(
				eq(finJournalLines.accountId, recon.bankAccountId),
				eq(finJournalEntries.status, 'posted'),
				eq(finJournalLines.reconciled, true),
				lte(finJournalEntries.date, recon.statementDate)
			)
		)
		.get();

	const reconciledBalance = (result?.totalDebit ?? 0) - (result?.totalCredit ?? 0);
	const now = Date.now();

	db.update(finReconciliations)
		.set({
			status: 'completed',
			reconciledBalance,
			completedAt: now,
			updatedAt: now
		})
		.where(eq(finReconciliations.id, event.params.reconId))
		.run();

	// Update bank account meta with last reconciled info
	const meta = db
		.select()
		.from(finBankAccountMeta)
		.where(eq(finBankAccountMeta.accountId, recon.bankAccountId))
		.get();

	if (meta) {
		db.update(finBankAccountMeta)
			.set({
				lastReconciledDate: recon.statementDate,
				lastReconciledBalance: reconciledBalance,
				updatedAt: now
			})
			.where(eq(finBankAccountMeta.accountId, recon.bankAccountId))
			.run();
	}

	return json({
		status: 'completed',
		reconciledBalance,
		statementBalance: recon.statementBalance,
		difference: recon.statementBalance - reconciledBalance
	});
};
