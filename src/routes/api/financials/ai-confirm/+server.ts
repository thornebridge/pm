import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines, finRecurringRules } from '$lib/server/db/schema.js';
import { getNextEntryNumber } from '$lib/server/financials/balance.js';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const {
		transactionType, amount, description, memo, date,
		bankAccountId, expenseAccountId, revenueAccountId,
		fromAccountId, toAccountId, referenceNumber,
		isRecurring, frequency, recurringEndDate, recurringName
	} = body;

	if (!transactionType || !amount || !date || !description?.trim()) {
		return json({ error: 'transactionType, amount, date, and description are required' }, { status: 400 });
	}

	const amountCents = Math.round(amount * 100);
	if (amountCents <= 0) {
		return json({ error: 'Amount must be positive' }, { status: 400 });
	}

	// Build journal lines based on transaction type
	let lines: Array<{ accountId: string; debit: number; credit: number }>;

	if (transactionType === 'expense') {
		if (!bankAccountId || !expenseAccountId) {
			return json({ error: 'bankAccountId and expenseAccountId required for expenses' }, { status: 400 });
		}
		lines = [
			{ accountId: expenseAccountId, debit: amountCents, credit: 0 },
			{ accountId: bankAccountId, debit: 0, credit: amountCents }
		];
	} else if (transactionType === 'deposit') {
		if (!bankAccountId || !revenueAccountId) {
			return json({ error: 'bankAccountId and revenueAccountId required for deposits' }, { status: 400 });
		}
		lines = [
			{ accountId: bankAccountId, debit: amountCents, credit: 0 },
			{ accountId: revenueAccountId, debit: 0, credit: amountCents }
		];
	} else if (transactionType === 'transfer') {
		if (!fromAccountId || !toAccountId) {
			return json({ error: 'fromAccountId and toAccountId required for transfers' }, { status: 400 });
		}
		lines = [
			{ accountId: toAccountId, debit: amountCents, credit: 0 },
			{ accountId: fromAccountId, debit: 0, credit: amountCents }
		];
	} else {
		return json({ error: 'Invalid transactionType' }, { status: 400 });
	}

	const now = Date.now();
	const dateTs = new Date(date).getTime();
	const entryId = nanoid(12);
	const entryNumber = await getNextEntryNumber();

	await db.insert(finJournalEntries).values({
		id: entryId,
		entryNumber,
		date: dateTs,
		description: description.trim(),
		memo: memo || null,
		referenceNumber: referenceNumber || null,
		status: 'posted',
		source: 'ai_entry',
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(finJournalLines).values(
		lines.map((line, i) => ({
			id: nanoid(12),
			journalEntryId: entryId,
			accountId: line.accountId,
			debit: line.debit,
			credit: line.credit,
			memo: null,
			position: i,
			createdAt: now
		}))
	);

	let recurringRuleId: string | null = null;

	if (isRecurring && frequency) {
		recurringRuleId = nanoid(12);
		const templateLines = lines.map((l) => ({
			accountId: l.accountId,
			debit: l.debit,
			credit: l.credit,
			memo: null
		}));

		// Compute next occurrence
		const nextDate = new Date(date);
		switch (frequency) {
			case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
			case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
			case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
			case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
			case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
			case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
		}

		await db.insert(finRecurringRules).values({
			id: recurringRuleId,
			name: recurringName || `${description.trim()} (recurring)`,
			description: 'Auto-created from AI entry',
			frequency,
			startDate: dateTs,
			endDate: recurringEndDate ? new Date(recurringEndDate).getTime() : null,
			nextOccurrence: nextDate.getTime(),
			autoPost: true,
			status: 'active',
			templateDescription: description.trim(),
			templateLines: JSON.stringify(templateLines),
			lastGeneratedAt: null,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now
		});
	}

	return json({ id: entryId, entryNumber, recurringRuleId }, { status: 201 });
};
