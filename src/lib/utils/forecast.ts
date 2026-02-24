export type ForecastCategory = 'commit' | 'best_case' | 'upside' | 'pipeline' | 'omit';

export function deriveForecastCategory(
	explicit: string | null | undefined,
	probability: number | null | undefined,
	stageProbability: number
): ForecastCategory {
	if (explicit && ['commit', 'best_case', 'upside', 'pipeline', 'omit'].includes(explicit)) {
		return explicit as ForecastCategory;
	}
	const p = probability ?? stageProbability;
	if (p >= 80) return 'commit';
	if (p >= 50) return 'best_case';
	if (p >= 20) return 'upside';
	return 'pipeline';
}

export const forecastCategoryConfig: Record<
	ForecastCategory,
	{ label: string; color: string; bgClass: string; textClass: string }
> = {
	commit: {
		label: 'Commit',
		color: '#22c55e',
		bgClass: 'bg-green-100 dark:bg-green-900/30',
		textClass: 'text-green-700 dark:text-green-400'
	},
	best_case: {
		label: 'Best Case',
		color: '#3b82f6',
		bgClass: 'bg-blue-100 dark:bg-blue-900/30',
		textClass: 'text-blue-700 dark:text-blue-400'
	},
	upside: {
		label: 'Upside',
		color: '#f59e0b',
		bgClass: 'bg-amber-100 dark:bg-amber-900/30',
		textClass: 'text-amber-700 dark:text-amber-400'
	},
	pipeline: {
		label: 'Pipeline',
		color: '#6b7280',
		bgClass: 'bg-surface-100 dark:bg-surface-800',
		textClass: 'text-surface-600 dark:text-surface-400'
	},
	omit: {
		label: 'Omit',
		color: '#ef4444',
		bgClass: 'bg-red-100 dark:bg-red-900/30',
		textClass: 'text-red-700 dark:text-red-400'
	}
};
