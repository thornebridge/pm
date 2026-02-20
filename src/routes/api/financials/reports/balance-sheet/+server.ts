import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

function getAccountsByType(accountType: string, asOf: number) {
	return db
		.select({
			accountId: finAccounts.id,
			accountNumber: finAccounts.accountNumber,
			name: finAccounts.name,
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finAccounts)
		.leftJoin(
			finJournalLines,
			and(
				eq(finJournalLines.accountId, finAccounts.id),
				sql`${finJournalLines.journalEntryId} IN (
					SELECT ${finJournalEntries.id} FROM ${finJournalEntries}
					WHERE ${finJournalEntries.status} = 'posted'
					AND ${finJournalEntries.date} <= ${asOf}
				)`
			)
		)
		.where(eq(finAccounts.accountType, accountType as any))
		.groupBy(finAccounts.id)
		.all();
}

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const asOfParam = url.searchParams.get('asOf');
	const asOf = asOfParam ? parseInt(asOfParam) : Date.now();

	if (isNaN(asOf)) {
		return json({ error: 'asOf must be a valid integer timestamp' }, { status: 400 });
	}

	// Assets: balance = SUM(debit) - SUM(credit)
	const assetRows = getAccountsByType('asset', asOf);
	const assets = assetRows.map((r) => ({
		accountId: r.accountId,
		accountNumber: r.accountNumber,
		name: r.name,
		balance: r.totalDebit - r.totalCredit
	}));

	// Liabilities: balance = SUM(credit) - SUM(debit)
	const liabilityRows = getAccountsByType('liability', asOf);
	const liabilities = liabilityRows.map((r) => ({
		accountId: r.accountId,
		accountNumber: r.accountNumber,
		name: r.name,
		balance: r.totalCredit - r.totalDebit
	}));

	// Equity: balance = SUM(credit) - SUM(debit)
	const equityRows = getAccountsByType('equity', asOf);
	const equity = equityRows.map((r) => ({
		accountId: r.accountId,
		accountNumber: r.accountNumber,
		name: r.name,
		balance: r.totalCredit - r.totalDebit
	}));

	// Net Income = Revenue totals - Expense totals (all time up to asOf)
	const revenueRows = getAccountsByType('revenue', asOf);
	const totalRevenueForNI = revenueRows.reduce((sum, r) => sum + (r.totalCredit - r.totalDebit), 0);

	const expenseRows = getAccountsByType('expense', asOf);
	const totalExpensesForNI = expenseRows.reduce((sum, r) => sum + (r.totalDebit - r.totalCredit), 0);

	const netIncome = totalRevenueForNI - totalExpensesForNI;

	const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
	const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
	const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

	return json({
		asOf,
		assets,
		liabilities,
		equity,
		totalAssets,
		totalLiabilities,
		totalEquity,
		netIncome
	});
};
