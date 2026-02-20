import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const currentYear = new Date().getFullYear();
	const year = url.searchParams.get('year') || String(currentYear);
	const periodType = url.searchParams.get('periodType') || 'monthly';

	const res = await fetch(
		`/api/financials/reports/budget-vs-actual?year=${year}&periodType=${periodType}`
	);
	const report = await res.json();

	return {
		report,
		filters: { year, periodType }
	};
};
