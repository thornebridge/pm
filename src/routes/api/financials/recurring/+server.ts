import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finRecurringRules } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const rules = db
		.select()
		.from(finRecurringRules)
		.orderBy(desc(finRecurringRules.createdAt))
		.all();

	return json(rules);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.name?.trim() || !body.frequency || !body.startDate || !body.templateDescription?.trim() || !body.templateLines) {
		return json({ error: 'name, frequency, startDate, templateDescription, and templateLines are required' }, { status: 400 });
	}

	const lines = typeof body.templateLines === 'string' ? JSON.parse(body.templateLines) : body.templateLines;
	if (!Array.isArray(lines) || lines.length < 2) {
		return json({ error: 'At least 2 template lines are required' }, { status: 400 });
	}

	const totalDebit = lines.reduce((sum: number, l: { debit?: number }) => sum + (l.debit || 0), 0);
	const totalCredit = lines.reduce((sum: number, l: { credit?: number }) => sum + (l.credit || 0), 0);
	if (totalDebit !== totalCredit) {
		return json({ error: 'Template lines must balance (debits = credits)' }, { status: 400 });
	}

	const now = Date.now();
	const rule = {
		id: nanoid(12),
		name: body.name.trim(),
		description: body.description || null,
		frequency: body.frequency,
		startDate: body.startDate,
		endDate: body.endDate || null,
		nextOccurrence: body.startDate,
		autoPost: body.autoPost ?? false,
		status: 'active' as const,
		templateDescription: body.templateDescription.trim(),
		templateLines: JSON.stringify(lines),
		lastGeneratedAt: null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(finRecurringRules).values(rule).run();
	return json(rule, { status: 201 });
};
