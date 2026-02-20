import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte, asc } from 'drizzle-orm';

interface LedgerEntry {
	date: number;
	entryNumber: number;
	description: string;
	debit: number;
	credit: number;
	balance: number;
}

function getLedgerForAccount(accountId: string, from: number, to: number): LedgerEntry[] {
	// Get the account's normal balance direction
	const account = db
		.select({ normalBalance: finAccounts.normalBalance })
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId))
		.get();

	if (!account) return [];

	const isDebitNormal = account.normalBalance === 'debit';

	// Get opening balance (all posted lines before `from`)
	const openingResult = db
		.select({
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(
			and(
				eq(finJournalLines.accountId, accountId),
				eq(finJournalEntries.status, 'posted'),
				sql`${finJournalEntries.date} < ${from}`
			)
		)
		.get();

	let runningBalance = isDebitNormal
		? (openingResult?.totalDebit ?? 0) - (openingResult?.totalCredit ?? 0)
		: (openingResult?.totalCredit ?? 0) - (openingResult?.totalDebit ?? 0);

	// Get all lines in the date range
	const lines = db
		.select({
			date: finJournalEntries.date,
			entryNumber: finJournalEntries.entryNumber,
			description: finJournalEntries.description,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(
			and(
				eq(finJournalLines.accountId, accountId),
				eq(finJournalEntries.status, 'posted'),
				gte(finJournalEntries.date, from),
				lte(finJournalEntries.date, to)
			)
		)
		.orderBy(asc(finJournalEntries.date), asc(finJournalEntries.entryNumber))
		.all();

	const entries: LedgerEntry[] = [];
	for (const line of lines) {
		if (isDebitNormal) {
			runningBalance += line.debit - line.credit;
		} else {
			runningBalance += line.credit - line.debit;
		}

		entries.push({
			date: line.date,
			entryNumber: line.entryNumber,
			description: line.description,
			debit: line.debit,
			credit: line.credit,
			balance: runningBalance
		});
	}

	return entries;
}

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const accountId = url.searchParams.get('accountId');
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	if (!fromParam || !toParam) {
		return json({ error: 'from and to query parameters are required' }, { status: 400 });
	}

	const from = parseInt(fromParam);
	const to = parseInt(toParam);

	if (isNaN(from) || isNaN(to)) {
		return json({ error: 'from and to must be valid integer timestamps' }, { status: 400 });
	}

	if (accountId) {
		// Single account mode
		const account = db
			.select()
			.from(finAccounts)
			.where(eq(finAccounts.id, accountId))
			.get();

		if (!account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		const entries = getLedgerForAccount(accountId, from, to);
		return json({ accountId, from, to, entries });
	}

	// All accounts mode: grouped by account
	const accounts = db
		.select()
		.from(finAccounts)
		.orderBy(asc(finAccounts.accountNumber))
		.all();

	const grouped = accounts.map((account) => ({
		accountId: account.id,
		accountNumber: account.accountNumber,
		name: account.name,
		accountType: account.accountType,
		entries: getLedgerForAccount(account.id, from, to)
	}));

	// Filter out accounts with no entries
	const filtered = grouped.filter((g) => g.entries.length > 0);

	return json({ from, to, accounts: filtered });
};
