import { db } from '../db/index.js';
import { finAccounts, finJournalEntries, finJournalLines } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getNextEntryNumber } from './balance.js';
import { nanoid } from 'nanoid';

/**
 * Create a revenue journal entry when a CRM opportunity is won.
 * Debit: Accounts Receivable (1200), Credit: Sales Revenue (4010)
 */
export function createRevenueJournalEntry(opts: {
	opportunityId: string;
	companyId: string;
	amount: number; // cents
	description: string;
	userId: string;
	proposalId?: string;
}): { id: string; entryNumber: number } | null {
	// Guard: check if accounts exist (financials seeded)
	const arAccount = db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.accountNumber, 1200))
		.get();

	const revenueAccount = db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.accountNumber, 4010))
		.get();

	if (!arAccount || !revenueAccount) {
		// Financials not seeded yet — silently skip
		return null;
	}

	// Guard: check for existing entry (prevent double-sync)
	const existing = db
		.select({ id: finJournalEntries.id })
		.from(finJournalEntries)
		.where(
			and(
				eq(finJournalEntries.crmOpportunityId, opts.opportunityId),
				eq(finJournalEntries.source, 'crm_sync')
			)
		)
		.get();

	if (existing) {
		return null; // Already synced
	}

	if (!opts.amount || opts.amount <= 0) {
		return null;
	}

	const now = Date.now();
	const entryId = nanoid(12);
	const entryNumber = getNextEntryNumber();

	db.insert(finJournalEntries)
		.values({
			id: entryId,
			entryNumber,
			date: now,
			description: opts.description,
			memo: null,
			referenceNumber: null,
			status: 'posted',
			source: 'crm_sync',
			crmOpportunityId: opts.opportunityId,
			crmProposalId: opts.proposalId || null,
			crmCompanyId: opts.companyId,
			createdBy: opts.userId,
			createdAt: now,
			updatedAt: now
		})
		.run();

	db.insert(finJournalLines)
		.values([
			{
				id: nanoid(12),
				journalEntryId: entryId,
				accountId: arAccount.id,
				debit: opts.amount,
				credit: 0,
				memo: 'Accounts Receivable',
				position: 0,
				createdAt: now
			},
			{
				id: nanoid(12),
				journalEntryId: entryId,
				accountId: revenueAccount.id,
				debit: 0,
				credit: opts.amount,
				memo: 'Sales Revenue',
				position: 1,
				createdAt: now
			}
		])
		.run();

	return { id: entryId, entryNumber };
}

/**
 * Record a payment received against an A/R entry.
 * Debit: Bank Account, Credit: Accounts Receivable
 */
export function recordPaymentReceived(opts: {
	bankAccountId: string;
	amount: number;
	opportunityId: string;
	companyId: string;
	description: string;
	userId: string;
}): { id: string; entryNumber: number } | null {
	const arAccount = db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.accountNumber, 1200))
		.get();

	if (!arAccount) return null;

	const now = Date.now();
	const entryId = nanoid(12);
	const entryNumber = getNextEntryNumber();

	db.insert(finJournalEntries)
		.values({
			id: entryId,
			entryNumber,
			date: now,
			description: opts.description,
			memo: null,
			referenceNumber: null,
			status: 'posted',
			source: 'crm_sync',
			crmOpportunityId: opts.opportunityId,
			crmCompanyId: opts.companyId,
			createdBy: opts.userId,
			createdAt: now,
			updatedAt: now
		})
		.run();

	db.insert(finJournalLines)
		.values([
			{
				id: nanoid(12),
				journalEntryId: entryId,
				accountId: opts.bankAccountId,
				debit: opts.amount,
				credit: 0,
				memo: 'Payment received',
				position: 0,
				createdAt: now
			},
			{
				id: nanoid(12),
				journalEntryId: entryId,
				accountId: arAccount.id,
				debit: 0,
				credit: opts.amount,
				memo: 'A/R reduction',
				position: 1,
				createdAt: now
			}
		])
		.run();

	return { id: entryId, entryNumber };
}
