import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	finBudgets,
	finAccounts,
	finJournalLines,
	finJournalEntries
} from '$lib/server/db/schema.js';
import { eq, and, gte, lte, asc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const budgets = db
		.select({
			id: finBudgets.id,
			accountId: finBudgets.accountId,
			accountNumber: finAccounts.accountNumber,
			accountName: finAccounts.name,
			accountType: finAccounts.accountType,
			normalBalance: finAccounts.normalBalance,
			periodType: finBudgets.periodType,
			periodStart: finBudgets.periodStart,
			periodEnd: finBudgets.periodEnd,
			amount: finBudgets.amount,
			notes: finBudgets.notes
		})
		.from(finBudgets)
		.leftJoin(finAccounts, eq(finBudgets.accountId, finAccounts.id))
		.orderBy(asc(finBudgets.periodStart), asc(finAccounts.accountNumber))
		.all();

	// Compute actual spend for each budget
	const budgetsWithActuals = budgets.map((budget) => {
		const actualResult = db
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
			)
			.get();

		const totalDebit = actualResult?.totalDebit ?? 0;
		const totalCredit = actualResult?.totalCredit ?? 0;

		let actual: number;
		if (budget.accountType === 'expense') {
			actual = totalDebit - totalCredit;
		} else if (budget.accountType === 'revenue') {
			actual = totalCredit - totalDebit;
		} else {
			actual =
				budget.normalBalance === 'debit'
					? totalDebit - totalCredit
					: totalCredit - totalDebit;
		}

		const variance = budget.amount - actual;
		const percentUsed =
			budget.amount !== 0 ? Math.round((actual / budget.amount) * 10000) / 100 : 0;

		return {
			...budget,
			actual,
			variance,
			percentUsed
		};
	});

	return { budgets: budgetsWithActuals };
};
