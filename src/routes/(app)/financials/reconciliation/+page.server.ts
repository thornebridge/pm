import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { finReconciliations, finAccounts } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
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

	return { reconciliations };
};
