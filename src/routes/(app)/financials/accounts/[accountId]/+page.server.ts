import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { getAccountBalance } from '$lib/server/financials/balance.js';

export const load: PageServerLoad = async ({ params }) => {
	const [account] = await db.select().from(finAccounts).where(eq(finAccounts.id, params.accountId));

	if (!account) {
		throw error(404, 'Account not found');
	}

	const balance = await getAccountBalance(params.accountId);

	// Recent 50 journal lines for this account, joined with entries
	const activity = await db
		.select({
			lineId: finJournalLines.id,
			entryId: finJournalEntries.id,
			entryNumber: finJournalEntries.entryNumber,
			date: finJournalEntries.date,
			description: finJournalEntries.description,
			status: finJournalEntries.status,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit,
			memo: finJournalLines.memo
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(
			and(
				eq(finJournalLines.accountId, params.accountId),
				eq(finJournalEntries.status, 'posted')
			)
		)
		.orderBy(asc(finJournalEntries.date), asc(finJournalEntries.entryNumber))
		.limit(50);

	return {
		account,
		balance,
		activity
	};
};
