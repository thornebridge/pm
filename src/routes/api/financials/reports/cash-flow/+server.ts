import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte, lt } from 'drizzle-orm';

/**
 * Get net movement for accounts of given types in a date range.
 * Returns SUM(debit) - SUM(credit) for debit-normal, or SUM(credit) - SUM(debit) for credit-normal.
 * We compute per-account and sum based on normal balance direction.
 */
async function getNetMovement(
	accountFilter: ReturnType<typeof sql>,
	from: number,
	to: number
): Promise<number> {
	const rows = await db
		.select({
			normalBalance: finAccounts.normalBalance,
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.innerJoin(finAccounts, eq(finJournalLines.accountId, finAccounts.id))
		.where(
			and(
				eq(finJournalEntries.status, 'posted'),
				gte(finJournalEntries.date, from),
				lte(finJournalEntries.date, to),
				accountFilter
			)
		)
		.groupBy(finAccounts.normalBalance);

	let net = 0;
	for (const row of rows) {
		if (row.normalBalance === 'debit') {
			net += row.totalDebit - row.totalCredit;
		} else {
			net += row.totalCredit - row.totalDebit;
		}
	}
	return net;
}

/**
 * Get the balance of cash accounts (accountNumber 1000-1099) up to a given date.
 * Cash accounts are assets, so balance = SUM(debit) - SUM(credit).
 */
async function getCashBalance(upTo: number): Promise<number> {
	const [result] = await db
		.select({
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.innerJoin(finAccounts, eq(finJournalLines.accountId, finAccounts.id))
		.where(
			and(
				eq(finJournalEntries.status, 'posted'),
				lte(finJournalEntries.date, upTo),
				sql`${finAccounts.accountNumber} >= 1000 AND ${finAccounts.accountNumber} <= 1099`
			)
		);

	return (result?.totalDebit ?? 0) - (result?.totalCredit ?? 0);
}

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
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

	// Operating: net of revenue + expense accounts
	const operating = await getNetMovement(
		sql`(${finAccounts.accountType} = 'revenue' OR ${finAccounts.accountType} = 'expense')`,
		from,
		to
	);

	// Investing: net of fixed asset accounts (accountNumber 1500-1599)
	const investing = await getNetMovement(
		sql`(${finAccounts.accountNumber} >= 1500 AND ${finAccounts.accountNumber} <= 1599)`,
		from,
		to
	);

	// Financing: net of equity + long-term liability accounts
	// Long-term liabilities are liabilities; equity is equity.
	const financing = await getNetMovement(
		sql`(${finAccounts.accountType} = 'equity' OR ${finAccounts.accountType} = 'liability')`,
		from,
		to
	);

	// Beginning cash balance: cash accounts up to (but not including) from date
	const beginningCash = await getCashBalance(from - 1);

	// Ending cash balance: cash accounts up to to date
	const endingCash = await getCashBalance(to);

	const netChange = endingCash - beginningCash;

	return json({
		from,
		to,
		operating,
		investing,
		financing,
		beginningCash,
		endingCash,
		netChange
	});
};
