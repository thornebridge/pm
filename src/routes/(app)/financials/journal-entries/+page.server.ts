import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines, finAccounts } from '$lib/server/db/schema.js';
import { eq, and, like, gte, lte, desc, asc, sql, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const q = url.searchParams.get('q');
	const limit = 50;
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (status) {
		conditions.push(eq(finJournalEntries.status, status as 'draft' | 'posted' | 'voided'));
	}
	if (from) {
		conditions.push(gte(finJournalEntries.date, parseInt(from)));
	}
	if (to) {
		conditions.push(lte(finJournalEntries.date, parseInt(to)));
	}
	if (q) {
		conditions.push(like(finJournalEntries.description, `%${q}%`));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [totalResult] = await db
		.select({ n: count() })
		.from(finJournalEntries)
		.where(where);
	const total = totalResult?.n ?? 0;

	const entries = await db
		.select()
		.from(finJournalEntries)
		.where(where)
		.orderBy(desc(finJournalEntries.date), desc(finJournalEntries.entryNumber))
		.limit(limit)
		.offset(offset);

	let entriesWithLines: Array<
		(typeof entries)[0] & {
			lines: Array<{
				id: string;
				journalEntryId: string;
				accountId: string;
				accountName: string;
				accountNumber: number;
				debit: number;
				credit: number;
				memo: string | null;
				position: number;
			}>;
		}
	> = [];

	if (entries.length > 0) {
		const entryIds = entries.map((e) => e.id);
		const lines = await db
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
			.orderBy(asc(finJournalLines.position));

		const linesByEntry = new Map<string, typeof lines>();
		for (const line of lines) {
			const existing = linesByEntry.get(line.journalEntryId) ?? [];
			existing.push(line);
			linesByEntry.set(line.journalEntryId, existing);
		}

		entriesWithLines = entries.map((entry) => ({
			...entry,
			lines: linesByEntry.get(entry.id) ?? []
		}));
	}

	return {
		entries: entriesWithLines,
		total,
		offset,
		limit,
		filters: {
			status: status || '',
			from: from || '',
			to: to || '',
			q: q || ''
		}
	};
};
