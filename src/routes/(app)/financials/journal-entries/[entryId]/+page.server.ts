import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines, finAccounts } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const entry = db
		.select()
		.from(finJournalEntries)
		.where(eq(finJournalEntries.id, params.entryId))
		.get();

	if (!entry) {
		throw error(404, 'Journal entry not found');
	}

	const lines = db
		.select({
			id: finJournalLines.id,
			journalEntryId: finJournalLines.journalEntryId,
			accountId: finJournalLines.accountId,
			accountName: finAccounts.name,
			accountNumber: finAccounts.accountNumber,
			accountType: finAccounts.accountType,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit,
			memo: finJournalLines.memo,
			position: finJournalLines.position,
			reconciled: finJournalLines.reconciled
		})
		.from(finJournalLines)
		.innerJoin(finAccounts, eq(finJournalLines.accountId, finAccounts.id))
		.where(eq(finJournalLines.journalEntryId, params.entryId))
		.orderBy(asc(finJournalLines.position))
		.all();

	// If voided, try to find the reversal entry
	let reversalEntry: { id: string; entryNumber: number } | null = null;
	if (entry.status === 'voided') {
		const reversal = db
			.select({
				id: finJournalEntries.id,
				entryNumber: finJournalEntries.entryNumber
			})
			.from(finJournalEntries)
			.where(eq(finJournalEntries.voidedEntryId, params.entryId))
			.get();
		reversalEntry = reversal ?? null;
	}

	return {
		entry,
		lines,
		reversalEntry
	};
};
