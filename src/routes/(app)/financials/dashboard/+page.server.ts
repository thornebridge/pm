import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, asc, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { accounts } = await parent();

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfMonthTs = startOfMonth.getTime();

	// Helper: sum balances from posted journal lines for accounts in a number range
	function sumBalancesForRange(minNum: number, maxNum: number) {
		const rangeAccountIds = accounts
			.filter((a) => a.accountNumber >= minNum && a.accountNumber < maxNum)
			.map((a) => a.id);

		if (rangeAccountIds.length === 0) return 0;

		const result = db
			.select({
				totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
				totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
			})
			.from(finJournalLines)
			.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
			.where(
				and(
					eq(finJournalEntries.status, 'posted'),
					sql`${finJournalLines.accountId} IN (${sql.join(rangeAccountIds.map((id) => sql`${id}`), sql`,`)})`
				)
			)
			.get();

		return (result?.totalDebit ?? 0) - (result?.totalCredit ?? 0);
	}

	// Helper: sum activity this month for accounts of a given type
	function sumMonthActivity(accountType: 'revenue' | 'expense') {
		const typeAccountIds = accounts.filter((a) => a.accountType === accountType).map((a) => a.id);

		if (typeAccountIds.length === 0) return 0;

		const result = db
			.select({
				totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
				totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
			})
			.from(finJournalLines)
			.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
			.where(
				and(
					eq(finJournalEntries.status, 'posted'),
					gte(finJournalEntries.date, startOfMonthTs),
					sql`${finJournalLines.accountId} IN (${sql.join(typeAccountIds.map((id) => sql`${id}`), sql`,`)})`
				)
			)
			.get();

		const totalDebit = result?.totalDebit ?? 0;
		const totalCredit = result?.totalCredit ?? 0;

		// Revenue is credit-normal, Expense is debit-normal
		return accountType === 'revenue' ? totalCredit - totalDebit : totalDebit - totalCredit;
	}

	// Cash balance: asset accounts 1000-1099 (debit-normal)
	const cashBalance = sumBalancesForRange(1000, 1100);

	// AR balance: accounts 1100-1299 (debit-normal)
	const arBalance = sumBalancesForRange(1100, 1300);

	// AP balance: accounts 2000-2099 (credit-normal, so negate for display as positive liability)
	const apAccountIds = accounts
		.filter((a) => a.accountNumber >= 2000 && a.accountNumber < 2100)
		.map((a) => a.id);

	let apBalance = 0;
	if (apAccountIds.length > 0) {
		const apResult = db
			.select({
				totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
				totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
			})
			.from(finJournalLines)
			.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
			.where(
				and(
					eq(finJournalEntries.status, 'posted'),
					sql`${finJournalLines.accountId} IN (${sql.join(apAccountIds.map((id) => sql`${id}`), sql`,`)})`
				)
			)
			.get();
		// AP is credit-normal: balance = credit - debit
		apBalance = (apResult?.totalCredit ?? 0) - (apResult?.totalDebit ?? 0);
	}

	const revenueMTD = sumMonthActivity('revenue');
	const expensesMTD = sumMonthActivity('expense');

	// Recent 10 journal entries with lines
	const recentEntries = db
		.select()
		.from(finJournalEntries)
		.orderBy(desc(finJournalEntries.date), desc(finJournalEntries.entryNumber))
		.limit(10)
		.all();

	let recentWithLines: Array<
		(typeof recentEntries)[0] & {
			lines: Array<{
				id: string;
				accountId: string;
				accountName: string;
				accountNumber: number;
				debit: number;
				credit: number;
				memo: string | null;
			}>;
		}
	> = [];

	if (recentEntries.length > 0) {
		const entryIds = recentEntries.map((e) => e.id);
		const lines = db
			.select({
				id: finJournalLines.id,
				journalEntryId: finJournalLines.journalEntryId,
				accountId: finJournalLines.accountId,
				accountName: finAccounts.name,
				accountNumber: finAccounts.accountNumber,
				debit: finJournalLines.debit,
				credit: finJournalLines.credit,
				memo: finJournalLines.memo,
				position: finJournalLines.position
			})
			.from(finJournalLines)
			.innerJoin(finAccounts, eq(finJournalLines.accountId, finAccounts.id))
			.where(
				sql`${finJournalLines.journalEntryId} IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`,`)})`
			)
			.orderBy(asc(finJournalLines.position))
			.all();

		const linesByEntry = new Map<string, typeof lines>();
		for (const line of lines) {
			const existing = linesByEntry.get(line.journalEntryId) ?? [];
			existing.push(line);
			linesByEntry.set(line.journalEntryId, existing);
		}

		recentWithLines = recentEntries.map((entry) => ({
			...entry,
			lines: linesByEntry.get(entry.id) ?? []
		}));
	}

	return {
		cashBalance,
		arBalance,
		apBalance,
		revenueMTD,
		expensesMTD,
		recentEntries: recentWithLines
	};
};
