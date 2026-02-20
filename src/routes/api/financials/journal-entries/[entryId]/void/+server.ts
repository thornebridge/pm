import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finJournalEntries, finJournalLines, finAccounts } from '$lib/server/db/schema.js';
import { getNextEntryNumber } from '$lib/server/financials/balance.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { entryId } = event.params;

	const entry = db.select().from(finJournalEntries).where(eq(finJournalEntries.id, entryId)).get();
	if (!entry) return json({ error: 'Journal entry not found' }, { status: 404 });

	if (entry.status !== 'posted') {
		return json({ error: 'Only posted entries can be voided' }, { status: 400 });
	}

	const body = await event.request.json().catch(() => ({}));
	const reason = body.reason || null;

	// Get original lines
	const originalLines = db
		.select()
		.from(finJournalLines)
		.where(eq(finJournalLines.journalEntryId, entryId))
		.orderBy(asc(finJournalLines.position))
		.all();

	const now = Date.now();
	const reversalId = nanoid(12);
	const reversalEntryNumber = getNextEntryNumber();

	// Create reversal entry with swapped debits/credits
	const reversalEntry = {
		id: reversalId,
		entryNumber: reversalEntryNumber,
		date: now,
		description: `Void reversal: ${entry.description}`,
		memo: reason ? `Void reason: ${reason}` : null,
		referenceNumber: entry.referenceNumber,
		status: 'posted' as const,
		source: 'void_reversal' as const,
		voidedEntryId: entryId,
		crmOpportunityId: entry.crmOpportunityId,
		crmProposalId: entry.crmProposalId,
		crmCompanyId: entry.crmCompanyId,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(finJournalEntries).values(reversalEntry).run();

	// Insert reversal lines with swapped debits/credits
	const reversalLines = originalLines.map((line, i) => ({
		id: nanoid(12),
		journalEntryId: reversalId,
		accountId: line.accountId,
		debit: line.credit,
		credit: line.debit,
		memo: line.memo,
		position: i,
		createdAt: now
	}));

	db.insert(finJournalLines).values(reversalLines).run();

	// Update original entry to voided
	db.update(finJournalEntries)
		.set({
			status: 'voided',
			voidedAt: now,
			voidReason: reason,
			updatedAt: now
		})
		.where(eq(finJournalEntries.id, entryId))
		.run();

	// Return reversal entry with lines and account names
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
		.where(eq(finJournalLines.journalEntryId, reversalId))
		.orderBy(asc(finJournalLines.position))
		.all();

	return json({ ...reversalEntry, lines }, { status: 201 });
};
