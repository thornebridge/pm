import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines, finAccounts } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { entryId } = event.params;

	const [entry] = await db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	if (!entry) return json({ error: 'Journal entry not found' }, { status: 404 });

	const lines = await db
		.select({
			id: finJournalLines.id,
			journalEntryId: finJournalLines.journalEntryId,
			accountId: finJournalLines.accountId,
			accountName: finAccounts.name,
			accountNumber: finAccounts.accountNumber,
			accountType: finAccounts.accountType,
			debit: finJournalLines.debit,
			credit: finJournalLines.credit,
			memo: finJournalLines.memo,
			position: finJournalLines.position,
			reconciled: finJournalLines.reconciled,
			reconciledAt: finJournalLines.reconciledAt
		})
		.from(finJournalLines)
		.innerJoin(finAccounts, eq(finJournalLines.accountId, finAccounts.id))
		.where(eq(finJournalLines.journalEntryId, entryId))
		.orderBy(asc(finJournalLines.position));

	return json({ ...entry, lines });
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { entryId } = event.params;

	const [entry] = await db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	if (!entry) return json({ error: 'Journal entry not found' }, { status: 404 });

	if (entry.status !== 'draft') {
		return json({ error: 'Only draft entries can be edited' }, { status: 400 });
	}

	const body = await event.request.json();
	const now = Date.now();
	const updates: Record<string, unknown> = { updatedAt: now };

	if ('date' in body) updates.date = body.date;
	if ('description' in body) {
		if (!body.description?.trim()) {
			return json({ error: 'description cannot be empty' }, { status: 400 });
		}
		updates.description = body.description.trim();
	}
	if ('memo' in body) updates.memo = body.memo || null;
	if ('referenceNumber' in body) updates.referenceNumber = body.referenceNumber || null;

	// If lines are provided, replace them
	if ('lines' in body) {
		const lines = body.lines;

		if (!Array.isArray(lines) || lines.length < 2) {
			return json({ error: 'At least 2 lines are required' }, { status: 400 });
		}

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

		// Delete old lines, insert new
		await db.delete(finJournalLines).where(eq(finJournalLines.journalEntryId, entryId));

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

		await db.insert(finJournalLines).values(lineRecords);
	}

	await db.update(finJournalEntries).set(updates).where(eq(finJournalEntries.id, entryId));

	// Return updated entry with lines
	const [updated] = await db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	const updatedLines = await db
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
		.where(eq(finJournalLines.journalEntryId, entryId))
		.orderBy(asc(finJournalLines.position));

	return json({ ...updated, lines: updatedLines });
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { entryId } = event.params;

	const [entry] = await db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	if (!entry) return json({ error: 'Journal entry not found' }, { status: 404 });

	if (entry.status !== 'draft') {
		return json({ error: 'Only draft entries can be deleted' }, { status: 400 });
	}

	// Lines cascade-delete via FK constraint
	await db.delete(finJournalEntries).where(eq(finJournalEntries.id, entryId));
	return json({ ok: true });
};
