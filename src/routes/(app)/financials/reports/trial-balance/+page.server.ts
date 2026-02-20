import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const now = new Date();
	const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
	const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

	const from = url.searchParams.get('from') || String(defaultFrom);
	const to = url.searchParams.get('to') || String(defaultTo);

	const res = await fetch(`/api/financials/reports/trial-balance?from=${from}&to=${to}`);
	const report = await res.json();

	return {
		report,
		filters: { from, to }
	};
};
