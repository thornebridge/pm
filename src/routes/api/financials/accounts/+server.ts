import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts } from '$lib/server/db/schema.js';
import { eq, and, like, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getAccountBalances } from '$lib/server/financials/balance.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const type = url.searchParams.get('type');
	const active = url.searchParams.get('active');
	const q = url.searchParams.get('q');

	const conditions = [];
	if (type) conditions.push(eq(finAccounts.accountType, type as any));
	if (active !== null && active !== undefined && active !== '') {
		conditions.push(eq(finAccounts.active, active === 'true'));
	}
	if (q) conditions.push(like(finAccounts.name, `%${q}%`));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const rows = db
		.select()
		.from(finAccounts)
		.where(where)
		.orderBy(asc(finAccounts.accountNumber))
		.all();

	const accountIds = rows.map((r) => r.id);
	const balances = getAccountBalances(accountIds);

	const result = rows.map((row) => ({
		...row,
		balance: balances.get(row.id) ?? 0
	}));

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.accountNumber && body.accountNumber !== 0) {
		return json({ error: 'accountNumber is required' }, { status: 400 });
	}
	if (!body.name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	if (!body.accountType) {
		return json({ error: 'accountType is required' }, { status: 400 });
	}
	if (!body.normalBalance) {
		return json({ error: 'normalBalance is required' }, { status: 400 });
	}

	// Check for duplicate account number
	const existing = db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.accountNumber, body.accountNumber))
		.get();

	if (existing) {
		return json({ error: 'An account with this number already exists' }, { status: 409 });
	}

	const now = Date.now();
	const account = {
		id: nanoid(12),
		accountNumber: body.accountNumber,
		name: body.name.trim(),
		accountType: body.accountType,
		subtype: body.subtype || null,
		description: body.description || null,
		parentId: body.parentId || null,
		normalBalance: body.normalBalance,
		currency: body.currency || 'USD',
		active: true,
		isSystem: false,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(finAccounts).values(account).run();
	return json(account, { status: 201 });
};
