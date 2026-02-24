import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines, finBudgets } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte, asc } from 'drizzle-orm';

function escapeCsvField(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function buildCsvRow(fields: (string | number | null | undefined)[]): string {
	return fields.map(escapeCsvField).join(',');
}

function centsToDecimal(cents: number): string {
	return (cents / 100).toFixed(2);
}

// ── Report Data Fetchers ────────────────────────────────────────────────────

async function getProfitLossData(from: number, to: number) {
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
		.groupBy(finAccounts.id);

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
		.groupBy(finAccounts.id);

	return { revenueAccounts, expenseAccounts };
}

async function getBalanceSheetData(asOf: number) {
	async function getByType(accountType: string) {
		return await db
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
			.groupBy(finAccounts.id);
	}

	return {
		assetRows: await getByType('asset'),
		liabilityRows: await getByType('liability'),
		equityRows: await getByType('equity'),
		revenueRows: await getByType('revenue'),
		expenseRows: await getByType('expense')
	};
}

async function getTrialBalanceData(from: number, to: number) {
	return await db
		.select({
			accountId: finAccounts.id,
			accountNumber: finAccounts.accountNumber,
			name: finAccounts.name,
			accountType: finAccounts.accountType,
			debit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			credit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
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
		.groupBy(finAccounts.id)
		.orderBy(asc(finAccounts.accountNumber));
}

async function getGeneralLedgerData(from: number, to: number, accountId?: string) {
	const conditions = [
		eq(finJournalEntries.status, 'posted'),
		gte(finJournalEntries.date, from),
		lte(finJournalEntries.date, to)
	];

	if (accountId) {
		conditions.push(eq(finJournalLines.accountId, accountId));
	}

	return await db
		.select({
			accountId: finJournalLines.accountId,
			accountNumber: finAccounts.accountNumber,
			accountName: finAccounts.name,
			date: finJournalEntries.date,
			entryNumber: finJournalEntries.entryNumber,
			description: finJournalEntries.description,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.innerJoin(finAccounts, eq(finJournalLines.accountId, finAccounts.id))
		.where(and(...conditions))
		.orderBy(asc(finAccounts.accountNumber), asc(finJournalEntries.date), asc(finJournalEntries.entryNumber));
}

async function getBudgetVsActualData(periodType: string, year: number) {
	const yearStart = new Date(year, 0, 1).getTime();
	const yearEnd = new Date(year + 1, 0, 1).getTime() - 1;

	const budgets = await db
		.select({
			accountId: finBudgets.accountId,
			periodStart: finBudgets.periodStart,
			periodEnd: finBudgets.periodEnd,
			amount: finBudgets.amount,
			accountNumber: finAccounts.accountNumber,
			accountName: finAccounts.name,
			accountType: finAccounts.accountType,
			normalBalance: finAccounts.normalBalance
		})
		.from(finBudgets)
		.innerJoin(finAccounts, eq(finBudgets.accountId, finAccounts.id))
		.where(
			and(
				eq(finBudgets.periodType, periodType as any),
				gte(finBudgets.periodStart, yearStart),
				lte(finBudgets.periodEnd, yearEnd)
			)
		);

	return await Promise.all(budgets.map(async (budget) => {
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

		return { ...budget, actual };
	}));
}

// ── CSV Generators ──────────────────────────────────────────────────────────

async function profitLossCsv(from: number, to: number): Promise<string> {
	const { revenueAccounts, expenseAccounts } = await getProfitLossData(from, to);

	const rows: string[] = [];
	rows.push(buildCsvRow(['Profit & Loss Statement', '', '']));
	rows.push(buildCsvRow(['From', new Date(from).toISOString(), '']));
	rows.push(buildCsvRow(['To', new Date(to).toISOString(), '']));
	rows.push('');

	rows.push(buildCsvRow(['Account Number', 'Account Name', 'Amount']));
	rows.push('');
	rows.push(buildCsvRow(['REVENUE', '', '']));

	let totalRevenue = 0;
	for (const r of revenueAccounts) {
		const total = r.totalCredit - r.totalDebit;
		totalRevenue += total;
		rows.push(buildCsvRow([r.accountNumber, r.name, centsToDecimal(total)]));
	}
	rows.push(buildCsvRow(['', 'Total Revenue', centsToDecimal(totalRevenue)]));

	rows.push('');
	rows.push(buildCsvRow(['EXPENSES', '', '']));

	let totalExpenses = 0;
	for (const r of expenseAccounts) {
		const total = r.totalDebit - r.totalCredit;
		totalExpenses += total;
		rows.push(buildCsvRow([r.accountNumber, r.name, centsToDecimal(total)]));
	}
	rows.push(buildCsvRow(['', 'Total Expenses', centsToDecimal(totalExpenses)]));

	rows.push('');
	rows.push(buildCsvRow(['', 'Net Income', centsToDecimal(totalRevenue - totalExpenses)]));

	return rows.join('\n');
}

async function balanceSheetCsv(asOf: number): Promise<string> {
	const { assetRows, liabilityRows, equityRows, revenueRows, expenseRows } = await getBalanceSheetData(asOf);

	const rows: string[] = [];
	rows.push(buildCsvRow(['Balance Sheet', '', '']));
	rows.push(buildCsvRow(['As Of', new Date(asOf).toISOString(), '']));
	rows.push('');

	rows.push(buildCsvRow(['Account Number', 'Account Name', 'Balance']));

	rows.push('');
	rows.push(buildCsvRow(['ASSETS', '', '']));
	let totalAssets = 0;
	for (const r of assetRows) {
		const balance = r.totalDebit - r.totalCredit;
		totalAssets += balance;
		rows.push(buildCsvRow([r.accountNumber, r.name, centsToDecimal(balance)]));
	}
	rows.push(buildCsvRow(['', 'Total Assets', centsToDecimal(totalAssets)]));

	rows.push('');
	rows.push(buildCsvRow(['LIABILITIES', '', '']));
	let totalLiabilities = 0;
	for (const r of liabilityRows) {
		const balance = r.totalCredit - r.totalDebit;
		totalLiabilities += balance;
		rows.push(buildCsvRow([r.accountNumber, r.name, centsToDecimal(balance)]));
	}
	rows.push(buildCsvRow(['', 'Total Liabilities', centsToDecimal(totalLiabilities)]));

	rows.push('');
	rows.push(buildCsvRow(['EQUITY', '', '']));
	let totalEquity = 0;
	for (const r of equityRows) {
		const balance = r.totalCredit - r.totalDebit;
		totalEquity += balance;
		rows.push(buildCsvRow([r.accountNumber, r.name, centsToDecimal(balance)]));
	}
	rows.push(buildCsvRow(['', 'Total Equity', centsToDecimal(totalEquity)]));

	const totalRevenueNI = revenueRows.reduce((s, r) => s + (r.totalCredit - r.totalDebit), 0);
	const totalExpenseNI = expenseRows.reduce((s, r) => s + (r.totalDebit - r.totalCredit), 0);
	const netIncome = totalRevenueNI - totalExpenseNI;

	rows.push('');
	rows.push(buildCsvRow(['', 'Net Income (Retained Earnings)', centsToDecimal(netIncome)]));
	rows.push(buildCsvRow(['', 'Total Liabilities + Equity + Net Income', centsToDecimal(totalLiabilities + totalEquity + netIncome)]));

	return rows.join('\n');
}

async function trialBalanceCsv(from: number, to: number): Promise<string> {
	const data = await getTrialBalanceData(from, to);

	const rows: string[] = [];
	rows.push(buildCsvRow(['Trial Balance', '', '', '', '']));
	rows.push(buildCsvRow(['From', new Date(from).toISOString(), '', '', '']));
	rows.push(buildCsvRow(['To', new Date(to).toISOString(), '', '', '']));
	rows.push('');

	rows.push(buildCsvRow(['Account Number', 'Account Name', 'Account Type', 'Debit', 'Credit']));

	let totalDebits = 0;
	let totalCredits = 0;
	for (const r of data) {
		totalDebits += r.debit;
		totalCredits += r.credit;
		rows.push(buildCsvRow([r.accountNumber, r.name, r.accountType, centsToDecimal(r.debit), centsToDecimal(r.credit)]));
	}

	rows.push('');
	rows.push(buildCsvRow(['', '', 'TOTALS', centsToDecimal(totalDebits), centsToDecimal(totalCredits)]));

	return rows.join('\n');
}

async function generalLedgerCsv(from: number, to: number, accountId?: string): Promise<string> {
	const data = await getGeneralLedgerData(from, to, accountId);

	const rows: string[] = [];
	rows.push(buildCsvRow(['General Ledger', '', '', '', '', '']));
	rows.push(buildCsvRow(['From', new Date(from).toISOString(), '', '', '', '']));
	rows.push(buildCsvRow(['To', new Date(to).toISOString(), '', '', '', '']));
	rows.push('');

	rows.push(buildCsvRow(['Account Number', 'Account Name', 'Date', 'Entry #', 'Description', 'Debit', 'Credit']));

	for (const r of data) {
		rows.push(buildCsvRow([
			r.accountNumber,
			r.accountName,
			new Date(r.date).toISOString(),
			r.entryNumber,
			r.description,
			centsToDecimal(r.debit),
			centsToDecimal(r.credit)
		]));
	}

	return rows.join('\n');
}

async function budgetVsActualCsv(periodType: string, year: number): Promise<string> {
	const data = await getBudgetVsActualData(periodType, year);

	const rows: string[] = [];
	rows.push(buildCsvRow(['Budget vs Actual', '', '', '', '', '', '']));
	rows.push(buildCsvRow(['Period Type', periodType, '', '', '', '', '']));
	rows.push(buildCsvRow(['Year', year, '', '', '', '', '']));
	rows.push('');

	rows.push(buildCsvRow(['Account Number', 'Account Name', 'Period Start', 'Period End', 'Budgeted', 'Actual', 'Variance', '% Used']));

	for (const r of data) {
		const budgeted = r.amount;
		const variance = budgeted - r.actual;
		const percentUsed = budgeted !== 0 ? Math.round((r.actual / budgeted) * 10000) / 100 : 0;

		rows.push(buildCsvRow([
			r.accountNumber,
			r.accountName,
			new Date(r.periodStart).toISOString(),
			new Date(r.periodEnd).toISOString(),
			centsToDecimal(budgeted),
			centsToDecimal(r.actual),
			centsToDecimal(variance),
			percentUsed
		]));
	}

	return rows.join('\n');
}

// ── Main Handler ────────────────────────────────────────────────────────────

const VALID_REPORTS = ['profit-loss', 'balance-sheet', 'trial-balance', 'general-ledger', 'budget-vs-actual'];

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const { reportName } = event.params;
	const url = event.url;

	if (!VALID_REPORTS.includes(reportName)) {
		return json(
			{ error: `Invalid report name. Valid reports: ${VALID_REPORTS.join(', ')}` },
			{ status: 400 }
		);
	}

	const format = url.searchParams.get('format') || 'csv';
	if (format !== 'csv') {
		return json({ error: 'Only csv format is currently supported' }, { status: 400 });
	}

	let csv: string;
	const filename = `${reportName}-${Date.now()}.csv`;

	switch (reportName) {
		case 'profit-loss': {
			const from = url.searchParams.get('from');
			const to = url.searchParams.get('to');
			if (!from || !to) {
				return json({ error: 'from and to query parameters are required' }, { status: 400 });
			}
			csv = await profitLossCsv(parseInt(from), parseInt(to));
			break;
		}
		case 'balance-sheet': {
			const asOf = url.searchParams.get('asOf');
			csv = await balanceSheetCsv(asOf ? parseInt(asOf) : Date.now());
			break;
		}
		case 'trial-balance': {
			const from = url.searchParams.get('from');
			const to = url.searchParams.get('to');
			if (!from || !to) {
				return json({ error: 'from and to query parameters are required' }, { status: 400 });
			}
			csv = await trialBalanceCsv(parseInt(from), parseInt(to));
			break;
		}
		case 'general-ledger': {
			const from = url.searchParams.get('from');
			const to = url.searchParams.get('to');
			const accountId = url.searchParams.get('accountId') || undefined;
			if (!from || !to) {
				return json({ error: 'from and to query parameters are required' }, { status: 400 });
			}
			csv = await generalLedgerCsv(parseInt(from), parseInt(to), accountId);
			break;
		}
		case 'budget-vs-actual': {
			const periodType = url.searchParams.get('periodType') || 'monthly';
			const yearParam = url.searchParams.get('year');
			if (!yearParam) {
				return json({ error: 'year query parameter is required' }, { status: 400 });
			}
			csv = await budgetVsActualCsv(periodType, parseInt(yearParam));
			break;
		}
		default:
			return json({ error: 'Unknown report' }, { status: 400 });
	}

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
