import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmPipelineStages,
	crmActivities,
	crmTasks,
	crmCompanies,
	users
} from '$lib/server/db/schema.js';
import { eq, and, desc, asc, isNull, sql, lte, gte, max, inArray, isNotNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const now = Date.now();
	const thirtyDaysFromNow = now + 30 * 86400000;
	const ninetyDaysAgo = now - 90 * 86400000;
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);
	const monthStartMs = monthStart.getTime();

	// All stages
	const stages = await db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position));

	const openStageIds = stages.filter((s) => !s.isClosed).map((s) => s.id);
	const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id);
	const lostStageIds = stages.filter((s) => s.isClosed && !s.isWon).map((s) => s.id);

	// Pipeline by stage (open only)
	const pipelineByStage = [];
	for (const s of stages.filter((s) => !s.isClosed)) {
		const [opps] = await db
			.select({
				count: sql<number>`COUNT(*)`,
				totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
			})
			.from(crmOpportunities)
			.where(eq(crmOpportunities.stageId, s.id));
		pipelineByStage.push({
			name: s.name,
			color: s.color,
			count: opps?.count || 0,
			value: opps?.totalValue || 0
		});
	}

	// Open deals count + total
	const [openDeals] = await db
		.select({
			count: sql<number>`COUNT(*)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(eq(crmPipelineStages.isClosed, false));

	// Weighted pipeline
	const [weightedResult] = await db
		.select({
			weighted: sql<number>`COALESCE(SUM(${crmOpportunities.value} * COALESCE(${crmOpportunities.probability}, ${crmPipelineStages.probability}) / 100), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(eq(crmPipelineStages.isClosed, false));

	// Won deals this month
	const [wonThisMonth] = await db
		.select({
			count: sql<number>`COUNT(*)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isWon, true),
				gte(crmOpportunities.actualCloseDate, monthStartMs)
			)
		);

	// Win rate (last 90 days)
	const closedRecently = await db
		.select({
			isWon: crmPipelineStages.isWon
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, true),
				gte(crmOpportunities.actualCloseDate, ninetyDaysAgo)
			)
		);

	const wonCount = closedRecently.filter((r) => r.isWon).length;
	const winRate = closedRecently.length > 0 ? Math.round((wonCount / closedRecently.length) * 100) : 0;

	// Upcoming activities (next 7 days)
	const sevenDays = now + 7 * 86400000;
	const upcomingActivities = await db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			scheduledAt: crmActivities.scheduledAt,
			companyId: crmActivities.companyId,
			companyName: crmCompanies.name,
			userName: users.name
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.leftJoin(crmCompanies, eq(crmActivities.companyId, crmCompanies.id))
		.where(
			and(
				gte(crmActivities.scheduledAt, now),
				lte(crmActivities.scheduledAt, sevenDays)
			)
		)
		.orderBy(asc(crmActivities.scheduledAt))
		.limit(10);

	// Overdue tasks
	const overdueTasks = await db
		.select({
			id: crmTasks.id,
			title: crmTasks.title,
			dueDate: crmTasks.dueDate,
			priority: crmTasks.priority,
			assigneeName: users.name,
			companyName: crmCompanies.name
		})
		.from(crmTasks)
		.leftJoin(users, eq(crmTasks.assigneeId, users.id))
		.leftJoin(crmCompanies, eq(crmTasks.companyId, crmCompanies.id))
		.where(
			and(
				isNull(crmTasks.completedAt),
				lte(crmTasks.dueDate, now)
			)
		)
		.orderBy(asc(crmTasks.dueDate))
		.limit(10);

	// Closing soon (next 30 days)
	const closingSoon = await db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			companyName: crmCompanies.name,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			stageName: crmPipelineStages.name,
			stageColor: crmPipelineStages.color
		})
		.from(crmOpportunities)
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, false),
				gte(crmOpportunities.expectedCloseDate, now),
				lte(crmOpportunities.expectedCloseDate, thirtyDaysFromNow)
			)
		)
		.orderBy(asc(crmOpportunities.expectedCloseDate))
		.limit(10);

	// Recent activity
	const recentActivity = await db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			companyName: crmCompanies.name,
			userName: users.name,
			createdAt: crmActivities.createdAt
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.leftJoin(crmCompanies, eq(crmActivities.companyId, crmCompanies.id))
		.orderBy(desc(crmActivities.createdAt))
		.limit(10);

	// === ACTION VIEW QUERIES ===

	// Today's tasks
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date();
	todayEnd.setHours(23, 59, 59, 999);
	const todayTasks = await db
		.select({
			id: crmTasks.id,
			title: crmTasks.title,
			dueDate: crmTasks.dueDate,
			priority: crmTasks.priority,
			opportunityId: crmTasks.opportunityId,
			companyName: crmCompanies.name,
			assigneeName: users.name
		})
		.from(crmTasks)
		.leftJoin(users, eq(crmTasks.assigneeId, users.id))
		.leftJoin(crmCompanies, eq(crmTasks.companyId, crmCompanies.id))
		.where(
			and(
				isNull(crmTasks.completedAt),
				gte(crmTasks.dueDate, todayStart.getTime()),
				lte(crmTasks.dueDate, todayEnd.getTime())
			)
		)
		.orderBy(asc(crmTasks.priority), asc(crmTasks.dueDate))
		.limit(20);

	// Overdue next steps — open opps where nextStepDueDate < now
	const overdueNextSteps = await db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			companyName: crmCompanies.name,
			nextStep: crmOpportunities.nextStep,
			nextStepDueDate: crmOpportunities.nextStepDueDate,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			ownerName: users.name,
			stageName: crmPipelineStages.name,
			stageColor: crmPipelineStages.color
		})
		.from(crmOpportunities)
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, false),
				isNotNull(crmOpportunities.nextStepDueDate),
				lte(crmOpportunities.nextStepDueDate, now)
			)
		)
		.orderBy(asc(crmOpportunities.nextStepDueDate))
		.limit(15);

	// Stale deals — open opps with last activity > 7 days ago
	const sevenDaysAgo = now - 7 * 86400000;
	let staleDeals: Array<{
		id: string;
		title: string;
		companyName: string;
		value: number | null;
		currency: string;
		ownerName: string | null;
		stageName: string;
		stageColor: string;
		lastActivityAt: number | null;
	}> = [];

	if (openStageIds.length > 0) {
		const openOpps = await db
			.select({
				id: crmOpportunities.id,
				title: crmOpportunities.title,
				companyName: crmCompanies.name,
				value: crmOpportunities.value,
				currency: crmOpportunities.currency,
				ownerName: users.name,
				stageName: crmPipelineStages.name,
				stageColor: crmPipelineStages.color,
				createdAt: crmOpportunities.createdAt
			})
			.from(crmOpportunities)
			.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
			.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
			.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
			.where(eq(crmPipelineStages.isClosed, false));

		const oppIds = openOpps.map((o) => o.id);
		const lastActivities: Record<string, number> = {};
		if (oppIds.length > 0) {
			const actRows = await db
				.select({
					opportunityId: crmActivities.opportunityId,
					lastAt: max(crmActivities.createdAt)
				})
				.from(crmActivities)
				.where(inArray(crmActivities.opportunityId, oppIds))
				.groupBy(crmActivities.opportunityId);
			for (const row of actRows) {
				if (row.opportunityId && row.lastAt) {
					lastActivities[row.opportunityId] = row.lastAt;
				}
			}
		}

		staleDeals = openOpps
			.map((o) => ({
				...o,
				lastActivityAt: lastActivities[o.id] || o.createdAt
			}))
			.filter((o) => (o.lastActivityAt || 0) < sevenDaysAgo)
			.sort((a, b) => (a.lastActivityAt || 0) - (b.lastActivityAt || 0))
			.slice(0, 15);
	}

	// Closing this week
	const closingThisWeek = await db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			companyName: crmCompanies.name,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			stageName: crmPipelineStages.name,
			stageColor: crmPipelineStages.color,
			ownerName: users.name
		})
		.from(crmOpportunities)
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
		.where(
			and(
				eq(crmPipelineStages.isClosed, false),
				gte(crmOpportunities.expectedCloseDate, now),
				lte(crmOpportunities.expectedCloseDate, sevenDays)
			)
		)
		.orderBy(asc(crmOpportunities.expectedCloseDate))
		.limit(15);

	return {
		metrics: {
			openDeals: openDeals?.count || 0,
			pipelineValue: openDeals?.totalValue || 0,
			weightedValue: weightedResult?.weighted || 0,
			wonThisMonth: wonThisMonth?.count || 0,
			wonValueThisMonth: wonThisMonth?.totalValue || 0,
			winRate
		},
		pipelineByStage,
		upcomingActivities,
		overdueTasks,
		closingSoon,
		recentActivity,
		// Action View
		todayTasks,
		overdueNextSteps,
		staleDeals,
		closingThisWeek,
		actionCounts: {
			todayTaskCount: todayTasks.length,
			overdueStepCount: overdueNextSteps.length,
			staleDealCount: staleDeals.length,
			closingWeekCount: closingThisWeek.length
		}
	};
};
