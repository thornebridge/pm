import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finReconciliations, finAccounts } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const reconciliations = await db
		.select({
			id: finReconciliations.id,
			bankAccountId: finReconciliations.bankAccountId,
			bankAccountName: finAccounts.name,
			bankAccountNumber: finAccounts.accountNumber,
			statementDate: finReconciliations.statementDate,
			statementBalance: finReconciliations.statementBalance,
			reconciledBalance: finReconciliations.reconciledBalance,
			status: finReconciliations.status,
			completedAt: finReconciliations.completedAt,
			createdAt: finReconciliations.createdAt
		})
		.from(finReconciliations)
		.leftJoin(finAccounts, eq(finReconciliations.bankAccountId, finAccounts.id))
		.orderBy(desc(finReconciliations.createdAt));

	return json(reconciliations);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.bankAccountId || body.statementDate == null || body.statementBalance == null) {
		return json({ error: 'bankAccountId, statementDate, and statementBalance are required' }, { status: 400 });
	}

	const now = Date.now();
	const recon = {
		id: nanoid(12),
		bankAccountId: body.bankAccountId,
		statementDate: body.statementDate,
		statementBalance: body.statementBalance,
		reconciledBalance: null,
		status: 'in_progress' as const,
		completedAt: null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(finReconciliations).values(recon);
	return json(recon, { status: 201 });
};
