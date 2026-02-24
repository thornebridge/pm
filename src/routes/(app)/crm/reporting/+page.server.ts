import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmPipelineStages,
	crmActivities,
	crmCompanies,
	users
} from '$lib/server/db/schema.js';
import { eq, and, desc, asc, sql, lte, gte } from 'drizzle-orm';
import { parsePeriodFromParams, computePeriodRange } from '$lib/utils/periods.js';

export const load: PageServerLoad = async ({ url }) => {
	const { period, customFrom, customTo } = parsePeriodFromParams(url.searchParams);
	const range = computePeriodRange(period, customFrom, customTo);
	const { fromMs, toMs } = range;

	// All stages ordered
	const stages = db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position))
		.all();

	// --- Pipeline funnel (open stages, current snapshot) ---
	const pipelineFunnel = stages
		.filter((s) => !s.isClosed)
		.map((s) => {
			const opps = db
				.select({
					count: sql<number>`COUNT(*)`,
					totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
				})
				.from(crmOpportunities)
				.where(eq(crmOpportunities.stageId, s.id))
				.get();
			return {
				name: s.name,
				color: s.color,
				count: opps?.count || 0,
				value: opps?.totalValue || 0
			};
		});

	// --- Win/Loss analysis for the period ---
	const wonInPeriod = db
		.select({
			count: sql<number>`COUNT(*)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isWon, true),
				gte(crmOpportunities.actualCloseDate, fromMs),
				lte(crmOpportunities.actualCloseDate, toMs)
			)
		)
		.get();

	const lostInPeriod = db
		.select({
			count: sql<number>`COUNT(*)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, true),
				eq(crmPipelineStages.isWon, false),
				gte(crmOpportunities.actualCloseDate, fromMs),
				lte(crmOpportunities.actualCloseDate, toMs)
			)
		)
		.get();

	// --- Lost reasons breakdown ---
	const lostReasons = db
		.select({
			reason: crmOpportunities.lostReason,
			count: sql<number>`COUNT(*)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, true),
				eq(crmPipelineStages.isWon, false),
				gte(crmOpportunities.actualCloseDate, fromMs),
				lte(crmOpportunities.actualCloseDate, toMs)
			)
		)
		.groupBy(crmOpportunities.lostReason)
		.orderBy(desc(sql`COUNT(*)`))
		.all()
		.map((r) => ({ reason: r.reason || 'Not specified', count: r.count }));

	// --- Win/loss trend by month (last 12 months) ---
	const twelveMonthsAgo = Date.now() - 365 * 86400000;
	const closedDeals = db
		.select({
			isWon: crmPipelineStages.isWon,
			closeDate: crmOpportunities.actualCloseDate,
			value: crmOpportunities.value
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, true),
				gte(crmOpportunities.actualCloseDate, twelveMonthsAgo)
			)
		)
		.all();

	// Bucket by month
	const trendMap = new Map<string, { won: number; lost: number }>();
	for (const d of closedDeals) {
		if (!d.closeDate) continue;
		const dt = new Date(d.closeDate);
		const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
		if (!trendMap.has(key)) trendMap.set(key, { won: 0, lost: 0 });
		const bucket = trendMap.get(key)!;
		if (d.isWon) bucket.won += d.value || 0;
		else bucket.lost += d.value || 0;
	}
	const winLossTrend = [...trendMap.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, data]) => ({
			month,
			label: new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
			won: data.won,
			lost: data.lost
		}));

	// --- Activity metrics for the period ---
	const activityByType = db
		.select({
			type: crmActivities.type,
			count: sql<number>`COUNT(*)`,
			totalDuration: sql<number>`COALESCE(SUM(${crmActivities.durationMinutes}), 0)`
		})
		.from(crmActivities)
		.where(
			and(
				gte(crmActivities.createdAt, fromMs),
				lte(crmActivities.createdAt, toMs)
			)
		)
		.groupBy(crmActivities.type)
		.all();

	const totalActivities = activityByType.reduce((a, b) => a + b.count, 0);
	const callData = activityByType.find((a) => a.type === 'call');
	const avgCallDuration = callData && callData.count > 0 ? Math.round(callData.totalDuration / callData.count) : 0;

	// --- Rep performance ---
	const repDeals = db
		.select({
			ownerId: crmOpportunities.ownerId,
			ownerName: users.name,
			count: sql<number>`COUNT(*)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`,
			wonCount: sql<number>`SUM(CASE WHEN ${crmPipelineStages.isWon} = 1 THEN 1 ELSE 0 END)`,
			wonValue: sql<number>`SUM(CASE WHEN ${crmPipelineStages.isWon} = 1 THEN ${crmOpportunities.value} ELSE 0 END)`,
			closedCount: sql<number>`SUM(CASE WHEN ${crmPipelineStages.isClosed} = 1 THEN 1 ELSE 0 END)`,
			avgCycleMs: sql<number>`AVG(CASE WHEN ${crmPipelineStages.isWon} = 1 THEN ${crmOpportunities.actualCloseDate} - ${crmOpportunities.createdAt} END)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.innerJoin(users, eq(crmOpportunities.ownerId, users.id))
		.where(
			and(
				gte(crmOpportunities.createdAt, fromMs),
				lte(crmOpportunities.createdAt, toMs)
			)
		)
		.groupBy(crmOpportunities.ownerId)
		.all();

	// Activity counts per rep
	const repActivityCounts = db
		.select({
			userId: crmActivities.userId,
			count: sql<number>`COUNT(*)`
		})
		.from(crmActivities)
		.where(
			and(
				gte(crmActivities.createdAt, fromMs),
				lte(crmActivities.createdAt, toMs)
			)
		)
		.groupBy(crmActivities.userId)
		.all();
	const repActivityMap: Record<string, number> = {};
	for (const r of repActivityCounts) {
		repActivityMap[r.userId] = r.count;
	}

	const repPerformance = repDeals.map((r) => ({
		name: r.ownerName || 'Unassigned',
		deals: r.count,
		totalValue: r.totalValue || 0,
		wonCount: r.wonCount || 0,
		wonValue: r.wonValue || 0,
		winRate: r.closedCount > 0 ? Math.round(((r.wonCount || 0) / r.closedCount) * 100) : 0,
		avgCycleDays: r.avgCycleMs ? Math.round(r.avgCycleMs / 86400000) : 0,
		activities: r.ownerId ? (repActivityMap[r.ownerId] || 0) : 0
	}));

	// --- Conversion by source ---
	const sourceStats = db
		.select({
			source: crmOpportunities.source,
			count: sql<number>`COUNT(*)`,
			wonCount: sql<number>`SUM(CASE WHEN ${crmPipelineStages.isWon} = 1 THEN 1 ELSE 0 END)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`,
			wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${crmPipelineStages.isWon} = 1 THEN ${crmOpportunities.value} ELSE 0 END), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				gte(crmOpportunities.createdAt, fromMs),
				lte(crmOpportunities.createdAt, toMs)
			)
		)
		.groupBy(crmOpportunities.source)
		.all()
		.map((s) => ({
			source: s.source || 'Unknown',
			count: s.count,
			wonCount: s.wonCount || 0,
			totalValue: s.totalValue,
			wonValue: s.wonValue,
			winRate: s.count > 0 ? Math.round(((s.wonCount || 0) / s.count) * 100) : 0,
			avgDealSize: s.count > 0 ? Math.round(s.totalValue / s.count) : 0
		}));

	// --- Average sales cycle ---
	const cycleResult = db
		.select({
			avgMs: sql<number>`AVG(${crmOpportunities.actualCloseDate} - ${crmOpportunities.createdAt})`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isWon, true),
				gte(crmOpportunities.actualCloseDate, fromMs),
				lte(crmOpportunities.actualCloseDate, toMs)
			)
		)
		.get();
	const avgSalesCycleDays = cycleResult?.avgMs ? Math.round(cycleResult.avgMs / 86400000) : 0;

	return {
		period,
		customFrom,
		customTo,
		periodLabel: range.label,
		pipelineFunnel,
		winLoss: {
			won: { count: wonInPeriod?.count || 0, value: wonInPeriod?.totalValue || 0 },
			lost: { count: lostInPeriod?.count || 0, value: lostInPeriod?.totalValue || 0 }
		},
		lostReasons,
		winLossTrend,
		activityMetrics: {
			byType: activityByType,
			total: totalActivities,
			avgCallDuration
		},
		repPerformance,
		sourceStats,
		avgSalesCycleDays
	};
};
