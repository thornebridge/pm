import { db } from '../db/index.js';
import { finRecurringRules, finJournalEntries, finJournalLines } from '../db/schema.js';
import { eq, and, lte } from 'drizzle-orm';
import { getNextEntryNumber } from './balance.js';
import { nanoid } from 'nanoid';

interface TemplateLine {
	accountId: string;
	debit: number;
	credit: number;
	memo?: string;
}

function computeNextOccurrence(current: number, frequency: string): number {
	const d = new Date(current);
	switch (frequency) {
		case 'daily':
			d.setDate(d.getDate() + 1);
			break;
		case 'weekly':
			d.setDate(d.getDate() + 7);
			break;
		case 'biweekly':
			d.setDate(d.getDate() + 14);
			break;
		case 'monthly':
			d.setMonth(d.getMonth() + 1);
			break;
		case 'quarterly':
			d.setMonth(d.getMonth() + 3);
			break;
		case 'yearly':
			d.setFullYear(d.getFullYear() + 1);
			break;
	}
	return d.getTime();
}

export async function generateFromRule(
	ruleId: string,
	userId: string
): Promise<{ id: string; entryNumber: number } | { error: string; status: number }> {
	const [rule] = await db
		.select()
		.from(finRecurringRules)
		.where(eq(finRecurringRules.id, ruleId));

	if (!rule) {
		return { error: 'Rule not found', status: 404 };
	}

	if (rule.status !== 'active') {
		return { error: 'Rule is not active', status: 400 };
	}

	const lines: TemplateLine[] = JSON.parse(rule.templateLines);
	const now = Date.now();
	const entryId = nanoid(12);
	const entryNumber = await getNextEntryNumber();

	await db.insert(finJournalEntries)
		.values({
			id: entryId,
			entryNumber,
			date: rule.nextOccurrence,
			description: rule.templateDescription,
			memo: null,
			referenceNumber: null,
			status: rule.autoPost ? 'posted' : 'draft',
			source: 'recurring',
			recurringRuleId: rule.id,
			createdBy: userId,
			createdAt: now,
			updatedAt: now
		});

	const lineValues = lines.map((line, i) => ({
		id: nanoid(12),
		journalEntryId: entryId,
		accountId: line.accountId,
		debit: line.debit || 0,
		credit: line.credit || 0,
		memo: line.memo || null,
		position: i,
		createdAt: now
	}));

	await db.insert(finJournalLines).values(lineValues);

	// Advance nextOccurrence
	const nextOccurrence = computeNextOccurrence(rule.nextOccurrence, rule.frequency);
	const updates: Record<string, unknown> = {
		nextOccurrence,
		lastGeneratedAt: now,
		updatedAt: now
	};

	// Auto-cancel if past end date
	if (rule.endDate && nextOccurrence > rule.endDate) {
		updates.status = 'cancelled';
	}

	await db.update(finRecurringRules)
		.set(updates)
		.where(eq(finRecurringRules.id, ruleId));

	return { id: entryId, entryNumber };
}

export async function processAllDueRules(
	userId: string
): Promise<Array<{ ruleId: string; ruleName: string; entryId?: string; error?: string }>> {
	const now = Date.now();
	const dueRules = await db
		.select()
		.from(finRecurringRules)
		.where(and(eq(finRecurringRules.status, 'active'), lte(finRecurringRules.nextOccurrence, now)));

	const results: Array<{ ruleId: string; ruleName: string; entryId?: string; error?: string }> = [];

	for (const rule of dueRules) {
		const result = await generateFromRule(rule.id, userId);
		if ('error' in result) {
			results.push({ ruleId: rule.id, ruleName: rule.name, error: result.error });
		} else {
			results.push({ ruleId: rule.id, ruleName: rule.name, entryId: result.id });
		}
	}

	return results;
}
