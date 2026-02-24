export type PeriodPreset =
	| 'this_month'
	| 'last_month'
	| 'this_quarter'
	| 'last_quarter'
	| 'last_90d'
	| 'ytd'
	| 'custom';

export interface PeriodRange {
	fromMs: number;
	toMs: number;
	label: string;
}

export function computePeriodRange(
	period: PeriodPreset,
	customFrom?: number | null,
	customTo?: number | null
): PeriodRange {
	const now = new Date();

	switch (period) {
		case 'this_month': {
			const from = new Date(now.getFullYear(), now.getMonth(), 1);
			const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
			return { fromMs: from.getTime(), toMs: to.getTime(), label: 'This Month' };
		}
		case 'last_month': {
			const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
			return { fromMs: from.getTime(), toMs: to.getTime(), label: 'Last Month' };
		}
		case 'this_quarter': {
			const q = Math.floor(now.getMonth() / 3);
			const from = new Date(now.getFullYear(), q * 3, 1);
			const to = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
			return { fromMs: from.getTime(), toMs: to.getTime(), label: `Q${q + 1} ${now.getFullYear()}` };
		}
		case 'last_quarter': {
			let q = Math.floor(now.getMonth() / 3) - 1;
			let year = now.getFullYear();
			if (q < 0) {
				q = 3;
				year--;
			}
			const from = new Date(year, q * 3, 1);
			const to = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
			return { fromMs: from.getTime(), toMs: to.getTime(), label: `Q${q + 1} ${year}` };
		}
		case 'last_90d': {
			const from = new Date(now.getTime() - 90 * 86400000);
			from.setHours(0, 0, 0, 0);
			return { fromMs: from.getTime(), toMs: now.getTime(), label: 'Last 90 Days' };
		}
		case 'ytd': {
			const from = new Date(now.getFullYear(), 0, 1);
			return { fromMs: from.getTime(), toMs: now.getTime(), label: `YTD ${now.getFullYear()}` };
		}
		case 'custom': {
			const fromMs = customFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).getTime();
			const toMs = customTo ?? now.getTime();
			const fromDate = new Date(fromMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
			const toDate = new Date(toMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
			return { fromMs, toMs, label: `${fromDate} – ${toDate}` };
		}
	}
}

export function parsePeriodFromParams(params: URLSearchParams): {
	period: PeriodPreset;
	customFrom: number | null;
	customTo: number | null;
} {
	const period = (params.get('period') as PeriodPreset) || 'this_quarter';
	const customFrom = params.get('from') ? Number(params.get('from')) : null;
	const customTo = params.get('to') ? Number(params.get('to')) : null;
	return { period, customFrom, customTo };
}

export function getMonthLabel(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function getMonthBucket(ms: number): number {
	const d = new Date(ms);
	return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
