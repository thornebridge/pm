import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql, asc } from 'drizzle-orm';

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

	const rows = await db
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

	const accounts = rows.map((r) => ({
		accountId: r.accountId,
		accountNumber: r.accountNumber,
		name: r.name,
		accountType: r.accountType,
		debit: r.debit,
		credit: r.credit
	}));

	const totalDebits = accounts.reduce((sum, a) => sum + a.debit, 0);
	const totalCredits = accounts.reduce((sum, a) => sum + a.credit, 0);

	return json({
		from,
		to,
		accounts,
		totalDebits,
		totalCredits
	});
};
