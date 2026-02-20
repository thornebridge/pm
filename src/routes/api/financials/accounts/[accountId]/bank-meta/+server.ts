import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts, finBankAccountMeta } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { accountId } = event.params;

	const account = db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId))
		.get();
	if (!account) return json({ error: 'Account not found' }, { status: 404 });

	const meta = db
		.select()
		.from(finBankAccountMeta)
		.where(eq(finBankAccountMeta.accountId, accountId))
		.get();

	if (!meta) return json(null);

	return json(meta);
};

export const PUT: RequestHandler = async (event) => {
	requireAuth(event);
	const { accountId } = event.params;

	const account = db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId))
		.get();
	if (!account) return json({ error: 'Account not found' }, { status: 404 });

	const body = await event.request.json();

	if (!body.accountSubtype) {
		return json({ error: 'accountSubtype is required' }, { status: 400 });
	}

	const now = Date.now();
	const existing = db
		.select()
		.from(finBankAccountMeta)
		.where(eq(finBankAccountMeta.accountId, accountId))
		.get();

	if (existing) {
		// Update existing
		const updates = {
			institutionName: body.institutionName ?? existing.institutionName,
			accountNumberLast4: body.accountNumberLast4 ?? existing.accountNumberLast4,
			routingNumber: body.routingNumber ?? existing.routingNumber,
			accountSubtype: body.accountSubtype,
			openingBalance: body.openingBalance ?? existing.openingBalance,
			openingBalanceDate: body.openingBalanceDate ?? existing.openingBalanceDate,
			updatedAt: now
		};

		db.update(finBankAccountMeta)
			.set(updates)
			.where(eq(finBankAccountMeta.accountId, accountId))
			.run();

		const updated = db
			.select()
			.from(finBankAccountMeta)
			.where(eq(finBankAccountMeta.accountId, accountId))
			.get();
		return json(updated);
	} else {
		// Create new
		const meta = {
			id: nanoid(12),
			accountId,
			institutionName: body.institutionName || null,
			accountNumberLast4: body.accountNumberLast4 || null,
			routingNumber: body.routingNumber || null,
			accountSubtype: body.accountSubtype,
			openingBalance: body.openingBalance ?? 0,
			openingBalanceDate: body.openingBalanceDate || null,
			lastReconciledDate: null,
			lastReconciledBalance: null,
			createdAt: now,
			updatedAt: now
		};

		db.insert(finBankAccountMeta).values(meta).run();
		return json(meta, { status: 201 });
	}
};
