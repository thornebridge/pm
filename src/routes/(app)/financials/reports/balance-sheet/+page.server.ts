import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const asOf = url.searchParams.get('asOf') || String(Date.now());

	const res = await fetch(`/api/financials/reports/balance-sheet?asOf=${asOf}`);
	const report = await res.json();

	return {
		report,
		filters: { asOf }
	};
};
