import { db } from '../db/index.js';
import { finAccounts, finJournalLines, finJournalEntries } from '../db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

/**
 * Compute the balance of a single account.
 * Debit-normal (asset, expense): balance = SUM(debit) - SUM(credit)
 * Credit-normal (liability, equity, revenue): balance = SUM(credit) - SUM(debit)
 * Only counts posted journal entries.
 */
export async function getAccountBalance(
	accountId: string,
	opts?: { from?: number; to?: number }
): Promise<number> {
	const conditions = [
		eq(finJournalLines.accountId, accountId),
		eq(finJournalEntries.status, 'posted')
	];

	if (opts?.from) {
		conditions.push(gte(finJournalEntries.date, opts.from));
	}
	if (opts?.to) {
		conditions.push(lte(finJournalEntries.date, opts.to));
	}

	const [result] = await db
		.select({
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(and(...conditions));

	const totalDebit = result?.totalDebit ?? 0;
	const totalCredit = result?.totalCredit ?? 0;

	// Look up normal balance direction
	const [account] = await db
		.select({ normalBalance: finAccounts.normalBalance })
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId));

	if (!account) return 0;

	return account.normalBalance === 'debit'
		? totalDebit - totalCredit
		: totalCredit - totalDebit;
}

/**
 * Compute balances for multiple accounts at once.
 */
export async function getAccountBalances(
	accountIds: string[],
	opts?: { from?: number; to?: number }
): Promise<Map<string, number>> {
	if (accountIds.length === 0) return new Map();

	const conditions = [eq(finJournalEntries.status, 'posted')];

	if (opts?.from) {
		conditions.push(gte(finJournalEntries.date, opts.from));
	}
	if (opts?.to) {
		conditions.push(lte(finJournalEntries.date, opts.to));
	}

	const rows = await db
		.select({
			accountId: finJournalLines.accountId,
			totalDebit: sql<number>`coalesce(sum(${finJournalLines.debit}), 0)`,
			totalCredit: sql<number>`coalesce(sum(${finJournalLines.credit}), 0)`
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(and(
			sql`${finJournalLines.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`,`)})`,
			...conditions
		))
		.groupBy(finJournalLines.accountId);

	// Get account normal balances
	const accounts = await db
		.select({ id: finAccounts.id, normalBalance: finAccounts.normalBalance })
		.from(finAccounts)
		.where(sql`${finAccounts.id} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`,`)})`);

	const normalBalanceMap = new Map(accounts.map(a => [a.id, a.normalBalance]));
	const balances = new Map<string, number>();

	// Initialize all requested accounts to 0
	for (const id of accountIds) {
		balances.set(id, 0);
	}

	for (const row of rows) {
		const normalBalance = normalBalanceMap.get(row.accountId);
		const balance = normalBalance === 'debit'
			? row.totalDebit - row.totalCredit
			: row.totalCredit - row.totalDebit;
		balances.set(row.accountId, balance);
	}

	return balances;
}

/**
 * Get the next available journal entry number.
 */
export async function getNextEntryNumber(): Promise<number> {
	const [result] = await db
		.select({ max: sql<number>`coalesce(max(${finJournalEntries.entryNumber}), 0)` })
		.from(finJournalEntries);

	return (result?.max ?? 0) + 1;
}

/**
 * Format cents as a dollar string for display.
 */
export function formatCents(cents: number): string {
	const negative = cents < 0;
	const abs = Math.abs(cents);
	const dollars = Math.floor(abs / 100);
	const remainder = abs % 100;
	const formatted = `$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
	return negative ? `(${formatted})` : formatted;
}
