import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines, finAccounts } from '$lib/server/db/schema.js';
import { getNextEntryNumber } from '$lib/server/financials/balance.js';
import { eq, and, like, asc, desc, sql, gte, lte, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const status = url.searchParams.get('status');
	const source = url.searchParams.get('source');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const accountId = url.searchParams.get('accountId');
	const q = url.searchParams.get('q');
	const sort = url.searchParams.get('sort') || 'date';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (status) conditions.push(eq(finJournalEntries.status, status as 'draft' | 'posted' | 'voided'));
	if (source) conditions.push(eq(finJournalEntries.source, source as 'manual' | 'crm_sync' | 'recurring' | 'import' | 'opening_balance' | 'void_reversal'));
	if (from) conditions.push(gte(finJournalEntries.date, parseInt(from)));
	if (to) conditions.push(lte(finJournalEntries.date, parseInt(to)));
	if (q) conditions.push(like(finJournalEntries.description, `%${q}%`));

	// If accountId filter, only return entries that have a line for that account
	if (accountId) {
		const entryIds = db
			.selectDistinct({ journalEntryId: finJournalLines.journalEntryId })
			.from(finJournalLines)
			.where(eq(finJournalLines.accountId, accountId))
			.all()
			.map((r) => r.journalEntryId);

		if (entryIds.length === 0) {
			return json({ data: [], total: 0 });
		}

		conditions.push(
			sql`${finJournalEntries.id} IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`,`)})`
		);
	}

	const where =
		conditions.length > 0
			? conditions.length === 1
				? conditions[0]
				: and(...conditions)
			: undefined;

	// Count total
	const totalResult = db
		.select({ n: count() })
		.from(finJournalEntries)
		.where(where)
		.get();
	const total = totalResult?.n ?? 0;

	// Sort
	const sortCol =
		sort === 'entryNumber'
			? finJournalEntries.entryNumber
			: sort === 'description'
				? finJournalEntries.description
				: sort === 'status'
					? finJournalEntries.status
					: finJournalEntries.date;
	const orderFn = dir === 'asc' ? asc : desc;

	const entries = db
		.select()
		.from(finJournalEntries)
		.where(where)
		.orderBy(orderFn(sortCol))
		.limit(limit)
		.offset(offset)
		.all();

	// Fetch lines for all returned entries
	if (entries.length === 0) {
		return json({ data: [], total });
	}

	const entryIds = entries.map((e) => e.id);
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
		.where(sql`${finJournalLines.journalEntryId} IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`,`)})`)
		.orderBy(asc(finJournalLines.position))
		.all();

	// Group lines by entry
	const linesByEntry = new Map<string, typeof lines>();
	for (const line of lines) {
		const existing = linesByEntry.get(line.journalEntryId) ?? [];
		existing.push(line);
		linesByEntry.set(line.journalEntryId, existing);
	}

	const data = entries.map((entry) => ({
		...entry,
		lines: linesByEntry.get(entry.id) ?? []
	}));

	return json({ data, total });
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { date, description, memo, referenceNumber, status, source, lines } = body;

	if (!date) {
		return json({ error: 'date is required' }, { status: 400 });
	}
	if (!description?.trim()) {
		return json({ error: 'description is required' }, { status: 400 });
	}
	if (!Array.isArray(lines) || lines.length < 2) {
		return json({ error: 'At least 2 lines are required' }, { status: 400 });
	}

	// Validate each line has exactly one of debit > 0 or credit > 0
	let totalDebits = 0;
	let totalCredits = 0;

	for (const line of lines) {
		const debit = line.debit ?? 0;
		const credit = line.credit ?? 0;

		if (!line.accountId) {
			return json({ error: 'Each line must have an accountId' }, { status: 400 });
		}
		if (debit > 0 && credit > 0) {
			return json({ error: 'Each line must have either a debit or credit, not both' }, { status: 400 });
		}
		if (debit <= 0 && credit <= 0) {
			return json({ error: 'Each line must have a debit > 0 or credit > 0' }, { status: 400 });
		}

		totalDebits += debit;
		totalCredits += credit;
	}

	if (totalDebits !== totalCredits) {
		return json({ error: `Debits (${totalDebits}) must equal credits (${totalCredits})` }, { status: 400 });
	}

	const now = Date.now();
	const entryId = nanoid(12);
	const entryNumber = getNextEntryNumber();

	const entry = {
		id: entryId,
		entryNumber,
		date,
		description: description.trim(),
		memo: memo || null,
		referenceNumber: referenceNumber || null,
		status: (status as 'draft' | 'posted') || 'draft',
		source: (source as 'manual' | 'crm_sync' | 'recurring' | 'import' | 'opening_balance' | 'void_reversal') || 'manual',
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(finJournalEntries).values(entry).run();

	const lineRecords = lines.map((line: { accountId: string; debit?: number; credit?: number; memo?: string }, i: number) => ({
		id: nanoid(12),
		journalEntryId: entryId,
		accountId: line.accountId,
		debit: line.debit ?? 0,
		credit: line.credit ?? 0,
		memo: line.memo || null,
		position: i,
		createdAt: now
	}));

	db.insert(finJournalLines).values(lineRecords).run();

	return json({ ...entry, lines: lineRecords }, { status: 201 });
};
