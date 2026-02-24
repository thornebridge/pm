import type { PageServerLoad } from './$types';
import { getAccountBalances } from '$lib/server/financials/balance.js';

export const load: PageServerLoad = async ({ parent }) => {
	const { accounts } = await parent();

	const accountIds = accounts.map((a) => a.id);
	const balances = await getAccountBalances(accountIds);

	const accountsWithBalances = accounts.map((a) => ({
		...a,
		balance: balances.get(a.id) ?? 0
	}));

	return {
		accountsWithBalances
	};
};
