import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines } from '$lib/server/db/schema.js';
import { getNextEntryNumber } from '$lib/server/financials/balance.js';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { bankAccountId, incomeAccountId, amount, date, description, memo, referenceNumber } = body;

	if (!bankAccountId || !incomeAccountId || !amount || !date || !description?.trim()) {
		return json({ error: 'bankAccountId, incomeAccountId, amount, date, and description are required' }, { status: 400 });
	}

	if (amount <= 0) {
		return json({ error: 'Amount must be positive' }, { status: 400 });
	}

	const now = Date.now();
	const entryId = nanoid(12);
	const entryNumber = await getNextEntryNumber();

	await db.insert(finJournalEntries)
		.values({
			id: entryId,
			entryNumber,
			date,
			description: description.trim(),
			memo: memo || null,
			referenceNumber: referenceNumber || null,
			status: 'posted',
			source: 'manual',
			createdBy: user.id,
			createdAt: now,
			updatedAt: now
		});

	// Debit bank account (asset increases), Credit income account (revenue increases)
	await db.insert(finJournalLines)
		.values([
			{
				id: nanoid(12),
				journalEntryId: entryId,
				accountId: bankAccountId,
				debit: amount,
				credit: 0,
				memo: null,
				position: 0,
				createdAt: now
			},
			{
				id: nanoid(12),
				journalEntryId: entryId,
				accountId: incomeAccountId,
				debit: 0,
				credit: amount,
				memo: null,
				position: 1,
				createdAt: now
			}
		]);

	return json({ id: entryId, entryNumber }, { status: 201 });
};
