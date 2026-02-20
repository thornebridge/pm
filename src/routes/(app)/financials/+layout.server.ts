import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { finAccounts } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

export const load: LayoutServerLoad = async () => {
	const accounts = db
		.select({
			id: finAccounts.id,
			accountNumber: finAccounts.accountNumber,
			name: finAccounts.name,
			accountType: finAccounts.accountType,
			subtype: finAccounts.subtype,
			parentId: finAccounts.parentId,
			normalBalance: finAccounts.normalBalance,
			active: finAccounts.active,
			isSystem: finAccounts.isSystem
		})
		.from(finAccounts)
		.where(eq(finAccounts.active, true))
		.orderBy(asc(finAccounts.accountNumber))
		.all();

	// Separate bank/cash accounts for quick access in forms
	const bankAccounts = accounts.filter(
		(a) => a.accountType === 'asset' && (a.subtype === 'current_asset') && a.accountNumber >= 1000 && a.accountNumber < 1100
	);

	const revenueAccounts = accounts.filter((a) => a.accountType === 'revenue');
	const expenseAccounts = accounts.filter((a) => a.accountType === 'expense');

	return {
		accounts,
		bankAccounts,
		revenueAccounts,
		expenseAccounts
	};
};
