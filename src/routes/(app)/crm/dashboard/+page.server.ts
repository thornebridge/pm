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
import { eq, and, desc, asc, isNull, sql, lte, gte } from 'drizzle-orm';

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
	const stages = db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position))
		.all();

	const openStageIds = stages.filter((s) => !s.isClosed).map((s) => s.id);
	const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id);
	const lostStageIds = stages.filter((s) => s.isClosed && !s.isWon).map((s) => s.id);

	// Pipeline by stage (open only)
	const pipelineByStage = stages
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

	// Open deals count + total
	const openDeals = db
		.select({
			count: sql<number>`COUNT(*)`,
			totalValue: sql<number>`COALESCE(SUM(${crmOpportunities.value}), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(eq(crmPipelineStages.isClosed, false))
		.get();

	// Weighted pipeline
	const weightedResult = db
		.select({
			weighted: sql<number>`COALESCE(SUM(${crmOpportunities.value} * COALESCE(${crmOpportunities.probability}, ${crmPipelineStages.probability}) / 100), 0)`
		})
		.from(crmOpportunities)
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.where(eq(crmPipelineStages.isClosed, false))
		.get();

	// Won deals this month
	const wonThisMonth = db
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
		)
		.get();

	// Win rate (last 90 days)
	const closedRecently = db
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
		)
		.all();

	const wonCount = closedRecently.filter((r) => r.isWon).length;
	const winRate = closedRecently.length > 0 ? Math.round((wonCount / closedRecently.length) * 100) : 0;

	// Upcoming activities (next 7 days)
	const sevenDays = now + 7 * 86400000;
	const upcomingActivities = db
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
		.limit(10)
		.all();

	// Overdue tasks
	const overdueTasks = db
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
		.limit(10)
		.all();

	// Closing soon (next 30 days)
	const closingSoon = db
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
		.limit(10)
		.all();

	// Recent activity
	const recentActivity = db
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
		.limit(10)
		.all();

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
		recentActivity
	};
};
