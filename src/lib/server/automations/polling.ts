import { db } from '../db/index.js';
import { automationRules, automationExecutions, tasks, checklistItems } from '../db/schema.js';
import { eq, and, lte, gt, isNotNull } from 'drizzle-orm';
import type { TriggerDef } from './types.js';
import { emitAutomationEvent } from './emit.js';

// Dedup set: prevents re-firing the same rule+task combo per poll cycle
const firedSet = new Set<string>();
const FIRED_SET_MAX = 10_000;

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startAutomationPoller(intervalMs = 60_000): void {
	if (pollInterval) return;

	pollInterval = setInterval(() => {
		pollTimeTriggers().catch((err) => {
			console.error('[automations/poller] Error:', err);
		});
	}, intervalMs);

	// Run once immediately
	pollTimeTriggers().catch(() => {});

	console.log(`[automations/poller] Started (interval: ${intervalMs}ms)`);
}

export function stopAutomationPoller(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}

async function pollTimeTriggers(): Promise<void> {
	// Cleanup old execution logs (30 days retention)
	const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
	await db.delete(automationExecutions).where(lte(automationExecutions.createdAt, thirtyDaysAgo));

	const rules = await db.select().from(automationRules).where(eq(automationRules.enabled, true));

	for (const row of rules) {
		let trigger: TriggerDef;
		try {
			trigger = JSON.parse(row.trigger) as TriggerDef;
		} catch {
			continue;
		}

		if (trigger.event === 'due_date.approaching') {
			await pollDueDateApproaching(row.id, row.projectId, trigger);
		} else if (trigger.event === 'checklist.completed') {
			await pollChecklistCompleted(row.id, row.projectId);
		}
	}

	// Periodically clear dedup set to prevent unbounded growth
	if (firedSet.size > FIRED_SET_MAX) {
		firedSet.clear();
	}
}

async function pollDueDateApproaching(
	ruleId: string,
	projectId: string,
	trigger: TriggerDef
): Promise<void> {
	const hoursBefore = trigger.config?.hoursBefore || 24;
	const now = Date.now();
	const threshold = now + hoursBefore * 60 * 60 * 1000;

	const approachingTasks = await db
		.select()
		.from(tasks)
		.where(
			and(
				eq(tasks.projectId, projectId),
				isNotNull(tasks.dueDate),
				gt(tasks.dueDate, now),
				lte(tasks.dueDate, threshold)
			)
		);

	for (const task of approachingTasks) {
		const key = `${ruleId}:${task.id}`;
		if (firedSet.has(key)) continue;
		firedSet.add(key);

		emitAutomationEvent({
			event: 'due_date.approaching',
			projectId,
			taskId: task.id,
			task: task as unknown as Record<string, unknown>,
			userId: '__automation__',
			chainDepth: 0
		});
	}
}

async function pollChecklistCompleted(ruleId: string, projectId: string): Promise<void> {
	// Find tasks in this project that have checklists
	const projectTasks = await db
		.select({ id: tasks.id })
		.from(tasks)
		.where(eq(tasks.projectId, projectId));

	for (const t of projectTasks) {
		const items = await db
			.select({ completed: checklistItems.completed })
			.from(checklistItems)
			.where(eq(checklistItems.taskId, t.id));

		if (items.length === 0) continue;
		const allCompleted = items.every((i) => i.completed);
		if (!allCompleted) continue;

		const key = `${ruleId}:${t.id}`;
		if (firedSet.has(key)) continue;
		firedSet.add(key);

		const [fullTask] = await db.select().from(tasks).where(eq(tasks.id, t.id));
		if (!fullTask) continue;

		emitAutomationEvent({
			event: 'checklist.completed',
			projectId,
			taskId: t.id,
			task: fullTask as unknown as Record<string, unknown>,
			userId: '__automation__',
			chainDepth: 0
		});
	}
}
