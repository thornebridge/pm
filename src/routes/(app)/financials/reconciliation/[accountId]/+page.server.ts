import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	finReconciliations,
	finAccounts,
	finJournalLines,
	finJournalEntries
} from '$lib/server/db/schema.js';
import { eq, and, lte, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	// Find the most recent (active or completed) reconciliation for this bank account
	const recon = db
		.select()
		.from(finReconciliations)
		.where(eq(finReconciliations.bankAccountId, params.accountId))
		.orderBy(desc(finReconciliations.createdAt))
		.limit(1)
		.get();

	if (!recon) {
		throw error(404, 'No reconciliation found for this account');
	}

	// Get the bank account info
	const account = db
		.select({
			id: finAccounts.id,
			name: finAccounts.name,
			accountNumber: finAccounts.accountNumber
		})
		.from(finAccounts)
		.where(eq(finAccounts.id, params.accountId))
		.get();

	if (!account) {
		throw error(404, 'Account not found');
	}

	// Get all posted journal lines for this account up to statement date
	const lines = db
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
		)
		.all();

	return {
		recon,
		account,
		lines
	};
};
