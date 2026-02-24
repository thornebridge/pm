import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmPipelineStages,
	crmCompanies,
	users
} from '$lib/server/db/schema.js';
import { eq, and, asc, sql, lte, gte } from 'drizzle-orm';
import { deriveForecastCategory } from '$lib/utils/forecast.js';

export const load: PageServerLoad = async ({ url }) => {
	const now = new Date();
	const viewMode = (url.searchParams.get('view') as 'monthly' | 'quarterly') || 'monthly';

	// Parse target period
	const targetMonth = url.searchParams.get('month')
		? parseInt(url.searchParams.get('month')!)
		: now.getMonth();
	const targetYear = url.searchParams.get('year')
		? parseInt(url.searchParams.get('year')!)
		: now.getFullYear();

	// Compute target period boundaries
	let periodFromMs: number;
	let periodToMs: number;
	let periodLabel: string;

	if (viewMode === 'quarterly') {
		const q = Math.floor(targetMonth / 3);
		const qStart = new Date(targetYear, q * 3, 1);
		const qEnd = new Date(targetYear, q * 3 + 3, 0, 23, 59, 59, 999);
		periodFromMs = qStart.getTime();
		periodToMs = qEnd.getTime();
		periodLabel = `Q${q + 1} ${targetYear}`;
	} else {
		const mStart = new Date(targetYear, targetMonth, 1);
		const mEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
		periodFromMs = mStart.getTime();
		periodToMs = mEnd.getTime();
		periodLabel = mStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	}

	// All pipeline stages
	const stages = db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position))
		.all();
	const stageMap: Record<string, { probability: number; isClosed: boolean }> = {};
	for (const s of stages) {
		stageMap[s.id] = { probability: s.probability, isClosed: s.isClosed };
	}

	// Open deals expected to close in the target period
	const forecastDeals = db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			companyName: crmCompanies.name,
			ownerName: users.name,
			ownerId: crmOpportunities.ownerId,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			probability: crmOpportunities.probability,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			forecastCategory: crmOpportunities.forecastCategory,
			stageId: crmOpportunities.stageId,
			stageName: crmPipelineStages.name,
			stageProbability: crmPipelineStages.probability
		})
		.from(crmOpportunities)
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, false),
				gte(crmOpportunities.expectedCloseDate, periodFromMs),
				lte(crmOpportunities.expectedCloseDate, periodToMs)
			)
		)
		.orderBy(asc(crmOpportunities.expectedCloseDate))
		.all()
		.map((d) => {
			const effectiveProbability = d.probability ?? d.stageProbability;
			const category = deriveForecastCategory(d.forecastCategory, d.probability, d.stageProbability);
			const weightedValue = Math.round(((d.value || 0) * effectiveProbability) / 100);
			return { ...d, category, weightedValue, effectiveProbability };
		});

	// Summary by category
	const categorySummary = {
		commit: { count: 0, value: 0, weighted: 0 },
		best_case: { count: 0, value: 0, weighted: 0 },
		upside: { count: 0, value: 0, weighted: 0 },
		pipeline: { count: 0, value: 0, weighted: 0 },
		omit: { count: 0, value: 0, weighted: 0 }
	};
	for (const d of forecastDeals) {
		const cat = d.category as keyof typeof categorySummary;
		if (categorySummary[cat]) {
			categorySummary[cat].count++;
			categorySummary[cat].value += d.value || 0;
			categorySummary[cat].weighted += d.weightedValue;
		}
	}

	// Monthly rollup (next 6 months from current date)
	const rollupMonths: Array<{
		label: string;
		month: number;
		year: number;
		commit: number;
		best_case: number;
		upside: number;
	}> = [];

	for (let i = 0; i < 6; i++) {
		const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
		const mEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59, 999);
		rollupMonths.push({
			label: m.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
			month: m.getMonth(),
			year: m.getFullYear(),
			commit: 0,
			best_case: 0,
			upside: 0
		});
	}

	// All open deals with expected close in next 6 months
	const sixMonthsOut = new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59, 999);
	const allForecastDeals = db
		.select({
			value: crmOpportunities.value,
			probability: crmOpportunities.probability,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			forecastCategory: crmOpportunities.forecastCategory,
			stageProbability: crmPipelineStages.probability
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, false),
				gte(crmOpportunities.expectedCloseDate, now.getTime()),
				lte(crmOpportunities.expectedCloseDate, sixMonthsOut.getTime())
			)
		)
		.all();

	for (const d of allForecastDeals) {
		if (!d.expectedCloseDate) continue;
		const dt = new Date(d.expectedCloseDate);
		const cat = deriveForecastCategory(d.forecastCategory, d.probability, d.stageProbability);
		if (cat === 'pipeline' || cat === 'omit') continue;

		const bucket = rollupMonths.find((m) => m.month === dt.getMonth() && m.year === dt.getFullYear());
		if (bucket && (cat === 'commit' || cat === 'best_case' || cat === 'upside')) {
			bucket[cat] += d.value || 0;
		}
	}

	// Historical closed-won (past 6 months for comparison)
	const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
	const historicalWon = db
		.select({
			closeDate: crmOpportunities.actualCloseDate,
			value: crmOpportunities.value
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isWon, true),
				gte(crmOpportunities.actualCloseDate, sixMonthsAgo)
			)
		)
		.all();

	const historicalByMonth: Array<{ label: string; value: number }> = [];
	for (let i = -6; i < 0; i++) {
		const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
		const mEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59, 999);
		const value = historicalWon
			.filter((d) => d.closeDate && d.closeDate >= m.getTime() && d.closeDate <= mEnd.getTime())
			.reduce((a, b) => a + (b.value || 0), 0);
		historicalByMonth.push({
			label: m.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
			value
		});
	}

	// Build available periods for the selector
	const availableMonths: Array<{ month: number; year: number; label: string }> = [];
	for (let i = 0; i < 12; i++) {
		const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
		availableMonths.push({
			month: m.getMonth(),
			year: m.getFullYear(),
			label: m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
		});
	}

	return {
		viewMode,
		targetMonth,
		targetYear,
		periodLabel,
		forecastDeals,
		categorySummary,
		rollupMonths,
		historicalByMonth,
		availableMonths
	};
};
