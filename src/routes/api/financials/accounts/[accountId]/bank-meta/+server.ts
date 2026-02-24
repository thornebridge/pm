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

	const [account] = await db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId));
	if (!account) return json({ error: 'Account not found' }, { status: 404 });

	const [meta] = await db
		.select()
		.from(finBankAccountMeta)
		.where(eq(finBankAccountMeta.accountId, accountId));

	if (!meta) return json(null);

	return json(meta);
};

export const PUT: RequestHandler = async (event) => {
	requireAuth(event);
	const { accountId } = event.params;

	const [account] = await db
		.select({ id: finAccounts.id })
		.from(finAccounts)
		.where(eq(finAccounts.id, accountId));
	if (!account) return json({ error: 'Account not found' }, { status: 404 });

	const body = await event.request.json();

	if (!body.accountSubtype) {
		return json({ error: 'accountSubtype is required' }, { status: 400 });
	}

	const now = Date.now();
	const [existing] = await db
		.select()
		.from(finBankAccountMeta)
		.where(eq(finBankAccountMeta.accountId, accountId));

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

		await db.update(finBankAccountMeta)
			.set(updates)
			.where(eq(finBankAccountMeta.accountId, accountId));

		const [updated] = await db
			.select()
			.from(finBankAccountMeta)
			.where(eq(finBankAccountMeta.accountId, accountId));
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

		await db.insert(finBankAccountMeta).values(meta);
		return json(meta, { status: 201 });
	}
};
