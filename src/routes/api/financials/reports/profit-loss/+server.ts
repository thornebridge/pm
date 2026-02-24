import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

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

	// Revenue accounts: total = SUM(credit) - SUM(debit) for each
	const revenueAccounts = await db
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
					AND ${finJournalEntries.date} >= ${from}
					AND ${finJournalEntries.date} <= ${to}
				)`
			)
		)
		.where(eq(finAccounts.accountType, 'revenue'))
		.groupBy(finAccounts.id)
		;

	const revenue = revenueAccounts.map((r) => ({
		accountId: r.accountId,
		accountNumber: r.accountNumber,
		name: r.name,
		total: r.totalCredit - r.totalDebit
	}));

	// Expense accounts: total = SUM(debit) - SUM(credit) for each
	const expenseAccounts = await db
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
					AND ${finJournalEntries.date} >= ${from}
					AND ${finJournalEntries.date} <= ${to}
				)`
			)
		)
		.where(eq(finAccounts.accountType, 'expense'))
		.groupBy(finAccounts.id)
		;

	const expenses = expenseAccounts.map((r) => ({
		accountId: r.accountId,
		accountNumber: r.accountNumber,
		name: r.name,
		total: r.totalDebit - r.totalCredit
	}));

	const totalRevenue = revenue.reduce((sum, r) => sum + r.total, 0);
	const totalExpenses = expenses.reduce((sum, r) => sum + r.total, 0);
	const netIncome = totalRevenue - totalExpenses;

	return json({
		from,
		to,
		revenue,
		expenses,
		totalRevenue,
		totalExpenses,
		netIncome
	});
};
