import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines, finBudgets } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const periodType = url.searchParams.get('periodType') || 'monthly';
	const yearParam = url.searchParams.get('year');

	if (!yearParam) {
		return json({ error: 'year query parameter is required' }, { status: 400 });
	}

	const year = parseInt(yearParam);
	if (isNaN(year)) {
		return json({ error: 'year must be a valid integer' }, { status: 400 });
	}

	// Determine the year boundaries as timestamps
	const yearStart = new Date(year, 0, 1).getTime();
	const yearEnd = new Date(year + 1, 0, 1).getTime() - 1;

	// Get all budgets matching the period type within the year
	const budgets = await db
		.select({
			id: finBudgets.id,
			accountId: finBudgets.accountId,
			periodType: finBudgets.periodType,
			periodStart: finBudgets.periodStart,
			periodEnd: finBudgets.periodEnd,
			amount: finBudgets.amount,
			accountNumber: finAccounts.accountNumber,
			accountName: finAccounts.name,
			normalBalance: finAccounts.normalBalance,
			accountType: finAccounts.accountType
		})
		.from(finBudgets)
		.innerJoin(finAccounts, eq(finBudgets.accountId, finAccounts.id))
		.where(
			and(
				eq(finBudgets.periodType, periodType as any),
				gte(finBudgets.periodStart, yearStart),
				lte(finBudgets.periodEnd, yearEnd)
			)
		)
;

	// For each budget entry, compute the actual spend in that period
	const items = await Promise.all(budgets.map(async (budget) => {
		const [actualResult] = await db
			.select({
				totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
				totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
			})
			.from(finJournalLines)
			.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
			.where(
				and(
					eq(finJournalLines.accountId, budget.accountId),
					eq(finJournalEntries.status, 'posted'),
					gte(finJournalEntries.date, budget.periodStart),
					lte(finJournalEntries.date, budget.periodEnd)
				)
			);

		// Compute actual based on account type convention:
		// Expense accounts: actual = SUM(debit) - SUM(credit)
		// Revenue accounts: actual = SUM(credit) - SUM(debit)
		// Others follow normal balance direction
		const totalDebit = actualResult?.totalDebit ?? 0;
		const totalCredit = actualResult?.totalCredit ?? 0;

		let actual: number;
		if (budget.accountType === 'expense') {
			actual = totalDebit - totalCredit;
		} else if (budget.accountType === 'revenue') {
			actual = totalCredit - totalDebit;
		} else {
			actual = budget.normalBalance === 'debit'
				? totalDebit - totalCredit
				: totalCredit - totalDebit;
		}

		const budgeted = budget.amount;
		const variance = budgeted - actual;
		const percentUsed = budgeted !== 0 ? Math.round((actual / budgeted) * 10000) / 100 : 0;

		return {
			accountId: budget.accountId,
			accountNumber: budget.accountNumber,
			name: budget.accountName,
			periodStart: budget.periodStart,
			periodEnd: budget.periodEnd,
			budgeted,
			actual,
			variance,
			percentUsed
		};
	}));

	return json({
		periodType,
		year,
		items
	});
};
