import { db } from '../db/index.js';
import {
	crmAutomationRules, crmAutomationExecutions, crmOpportunities,
	crmActivities, crmPipelineStages
} from '../db/schema.js';
import { eq, and, lte, gt, isNotNull, isNull, desc, max } from 'drizzle-orm';
import type { CrmTriggerDef } from './types.js';
import { emitCrmAutomationEvent } from './emit.js';

const firedSet = new Set<string>();
const FIRED_SET_MAX = 10_000;

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startCrmAutomationPoller(intervalMs = 60_000): void {
	if (pollInterval) return;

	pollInterval = setInterval(() => {
		pollCrmTimeTriggers().catch((err) => {
			console.error('[crm-automations/poller] Error:', err);
		});
	}, intervalMs);

	// Run once immediately
	pollCrmTimeTriggers().catch(() => {});

	console.log(`[crm-automations/poller] Started (interval: ${intervalMs}ms)`);
}

export function stopCrmAutomationPoller(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}

async function pollCrmTimeTriggers(): Promise<void> {
	// Cleanup old execution logs (30 days retention)
	const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
	await db.delete(crmAutomationExecutions).where(lte(crmAutomationExecutions.createdAt, thirtyDaysAgo));

	const rules = await db.select().from(crmAutomationRules).where(eq(crmAutomationRules.enabled, true));

	for (const row of rules) {
		let trigger: CrmTriggerDef;
		try {
			trigger = JSON.parse(row.trigger) as CrmTriggerDef;
		} catch {
			continue;
		}

		if (trigger.event === 'deal.stale') {
			await pollDealStale(row.id, trigger);
		} else if (trigger.event === 'deal.no_next_step') {
			await pollDealNoNextStep(row.id);
		} else if (trigger.event === 'close_date.approaching') {
			await pollCloseDateApproaching(row.id, trigger);
		}
	}

	if (firedSet.size > FIRED_SET_MAX) {
		firedSet.clear();
	}
}

async function pollDealStale(ruleId: string, trigger: CrmTriggerDef): Promise<void> {
	const staleDays = trigger.config?.staleDays || 7;
	const threshold = Date.now() - staleDays * 86400000;

	// Get open opportunities (not in closed stages)
	const closedStageRows = await db.select({ id: crmPipelineStages.id })
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.isClosed, true));
	const closedStageIds = closedStageRows.map((s) => s.id);

	const allOpps = await db.select().from(crmOpportunities);
	const openOpps = allOpps.filter((o) => !closedStageIds.includes(o.stageId));

	for (const opp of openOpps) {
		const key = `${ruleId}:${opp.id}`;
		if (firedSet.has(key)) continue;

		// Check last activity
		const [lastActivity] = await db.select({ createdAt: crmActivities.createdAt })
			.from(crmActivities)
			.where(eq(crmActivities.opportunityId, opp.id))
			.orderBy(desc(crmActivities.createdAt))
			.limit(1);

		const lastActivityTime = lastActivity?.createdAt ?? opp.createdAt;
		if (lastActivityTime > threshold) continue;

		firedSet.add(key);
		emitCrmAutomationEvent({
			event: 'deal.stale',
			entityType: 'opportunity',
			entityId: opp.id,
			entity: opp as unknown as Record<string, unknown>,
			userId: '__automation__',
			chainDepth: 0
		});
	}
}

async function pollDealNoNextStep(ruleId: string): Promise<void> {
	// Get open opportunities without a next step
	const closedStageRows = await db.select({ id: crmPipelineStages.id })
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.isClosed, true));
	const closedStageIds = closedStageRows.map((s) => s.id);

	const allOppsNoNextStep = await db.select().from(crmOpportunities)
		.where(isNull(crmOpportunities.nextStep));
	const oppsNoNextStep = allOppsNoNextStep.filter((o) => !closedStageIds.includes(o.stageId));

	for (const opp of oppsNoNextStep) {
		const key = `${ruleId}:${opp.id}`;
		if (firedSet.has(key)) continue;
		firedSet.add(key);

		emitCrmAutomationEvent({
			event: 'deal.no_next_step',
			entityType: 'opportunity',
			entityId: opp.id,
			entity: opp as unknown as Record<string, unknown>,
			userId: '__automation__',
			chainDepth: 0
		});
	}
}

async function pollCloseDateApproaching(ruleId: string, trigger: CrmTriggerDef): Promise<void> {
	const daysBefore = trigger.config?.daysBefore || 7;
	const now = Date.now();
	const threshold = now + daysBefore * 86400000;

	const closedStageRows = await db.select({ id: crmPipelineStages.id })
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.isClosed, true));
	const closedStageIds = closedStageRows.map((s) => s.id);

	const allApproachingOpps = await db.select().from(crmOpportunities)
		.where(
			and(
				isNotNull(crmOpportunities.expectedCloseDate),
				gt(crmOpportunities.expectedCloseDate, now),
				lte(crmOpportunities.expectedCloseDate, threshold)
			)
		);
	const approachingOpps = allApproachingOpps.filter((o) => !closedStageIds.includes(o.stageId));

	for (const opp of approachingOpps) {
		const key = `${ruleId}:${opp.id}`;
		if (firedSet.has(key)) continue;
		firedSet.add(key);

		emitCrmAutomationEvent({
			event: 'close_date.approaching',
			entityType: 'opportunity',
			entityId: opp.id,
			entity: opp as unknown as Record<string, unknown>,
			userId: '__automation__',
			chainDepth: 0
		});
	}
}
