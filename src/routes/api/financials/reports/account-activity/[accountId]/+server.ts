import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte, asc, count } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const { accountId } = event.params;
	const url = event.url;
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	// Verify account exists
	const [account] = await db
		.select()
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId));

	if (!account) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	const conditions = [
		eq(finJournalLines.accountId, accountId),
		eq(finJournalEntries.status, 'posted')
	];

	if (fromParam) {
		const from = parseInt(fromParam);
		if (!isNaN(from)) conditions.push(gte(finJournalEntries.date, from));
	}
	if (toParam) {
		const to = parseInt(toParam);
		if (!isNaN(to)) conditions.push(lte(finJournalEntries.date, to));
	}

	const where = and(...conditions);

	// Get total count
	const [totalResult] = await db
		.select({ n: count() })
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(where);

	const total = totalResult?.n ?? 0;

	// Get paginated results
	const lines = await db
		.select({
			lineId: finJournalLines.id,
			date: finJournalEntries.date,
			entryNumber: finJournalEntries.entryNumber,
			description: finJournalEntries.description,
			memo: finJournalLines.memo,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit,
			journalEntryId: finJournalLines.journalEntryId
		})
		.from(finJournalLines)
		.innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
		.where(where)
		.orderBy(asc(finJournalEntries.date), asc(finJournalEntries.entryNumber))
		.limit(limit)
		.offset(offset);

	return json({
		accountId,
		accountNumber: account.accountNumber,
		name: account.name,
		entries: lines,
		total,
		limit,
		offset
	});
};
