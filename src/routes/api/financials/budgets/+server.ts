import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finBudgets, finAccounts } from '$lib/server/db/schema.js';
import { eq, and, sql, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const accountId = url.searchParams.get('accountId');
	const periodType = url.searchParams.get('periodType');
	const year = url.searchParams.get('year');

	const conditions = [];
	if (accountId) conditions.push(eq(finBudgets.accountId, accountId));
	if (periodType) conditions.push(eq(finBudgets.periodType, periodType as 'monthly' | 'quarterly' | 'yearly'));
	if (year) {
		const yearStart = new Date(parseInt(year), 0, 1).getTime();
		const yearEnd = new Date(parseInt(year) + 1, 0, 1).getTime();
		conditions.push(sql`${finBudgets.periodStart} >= ${yearStart}`);
		conditions.push(sql`${finBudgets.periodStart} < ${yearEnd}`);
	}

	let query = db
		.select({
			id: finBudgets.id,
			accountId: finBudgets.accountId,
			accountNumber: finAccounts.accountNumber,
			accountName: finAccounts.name,
			periodType: finBudgets.periodType,
			periodStart: finBudgets.periodStart,
			periodEnd: finBudgets.periodEnd,
			amount: finBudgets.amount,
			notes: finBudgets.notes,
			createdAt: finBudgets.createdAt
		})
		.from(finBudgets)
		.leftJoin(finAccounts, eq(finBudgets.accountId, finAccounts.id))
		.orderBy(asc(finAccounts.accountNumber), asc(finBudgets.periodStart));

	if (conditions.length > 0) {
		query = query.where(and(...conditions)) as typeof query;
	}

	const budgets = await query;
	return json(budgets);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	// Support bulk create: body can be an array or single object
	const items = Array.isArray(body) ? body : [body];
	const now = Date.now();
	const created = [];

	for (const item of items) {
		if (!item.accountId || !item.periodType || item.periodStart == null || item.periodEnd == null || item.amount == null) {
			return json({ error: 'accountId, periodType, periodStart, periodEnd, and amount are required' }, { status: 400 });
		}

		const budget = {
			id: nanoid(12),
			accountId: item.accountId,
			periodType: item.periodType,
			periodStart: item.periodStart,
			periodEnd: item.periodEnd,
			amount: item.amount,
			notes: item.notes || null,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now
		};

		await db.insert(finBudgets).values(budget);
		created.push(budget);
	}

	return json(created.length === 1 ? created[0] : created, { status: 201 });
};
