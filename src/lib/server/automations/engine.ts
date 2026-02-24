import { db } from '../db/index.js';
import { automationRules, automationExecutions, tasks, taskLabelAssignments } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { executeAction } from './actions.js';
import type {
	AutomationEventPayload, AutomationRule, TriggerDef, ConditionGroup,
	Condition, ActionDef, ActionResult, ActionType
} from './types.js';
import { MAX_CHAIN_DEPTH, TERMINAL_ACTIONS } from './types.js';

export async function processAutomations(payload: AutomationEventPayload): Promise<void> {
	const depth = payload.chainDepth ?? 0;
	if (depth >= MAX_CHAIN_DEPTH) return;

	const rules = await db
		.select()
		.from(automationRules)
		.where(and(eq(automationRules.projectId, payload.projectId), eq(automationRules.enabled, true)));

	for (const row of rules) {
		let rule: AutomationRule;
		try {
			rule = {
				id: row.id,
				projectId: row.projectId,
				name: row.name,
				trigger: JSON.parse(row.trigger) as TriggerDef,
				conditions: row.conditions ? JSON.parse(row.conditions) as ConditionGroup[] : null,
				actions: JSON.parse(row.actions) as ActionDef[],
				enabled: row.enabled
			};
		} catch {
			continue;
		}

		if (!matchesTrigger(rule.trigger, payload)) continue;

		const start = Date.now();
		const actionsRun: ActionResult[] = [];
		let execStatus: 'success' | 'error' | 'skipped' = 'success';
		let execError: string | null = null;

		try {
			// Evaluate conditions
			if (rule.conditions && rule.conditions.length > 0) {
				const task = payload.task;
				const conditionsMet = await evaluateConditions(rule.conditions, task, payload.taskId);
				if (!conditionsMet) {
					execStatus = 'skipped';
					await logExecution(rule.id, payload.taskId, payload.event, execStatus, actionsRun, null, Date.now() - start);
					continue;
				}
			}

			// Execute actions
			for (const action of rule.actions) {
				try {
					const result = await executeAction(action, payload.taskId, payload.task, payload.projectId);
					actionsRun.push(result);

					// Re-emit events for field mutations (non-terminal actions)
					if (!TERMINAL_ACTIONS.includes(action.type as ActionType) && action.type === 'set_field') {
						const [updatedTask] = await db.select().from(tasks).where(eq(tasks.id, payload.taskId));
						if (updatedTask) {
							const fieldToEvent: Record<string, string> = {
								statusId: 'task.status_changed',
								priority: 'task.priority_changed',
								assigneeId: 'task.assigned',
								dueDate: 'task.due_date_changed',
								type: 'task.type_changed'
							};
							const newEvent = fieldToEvent[(action as { field: string }).field];
							if (newEvent) {
								// Fire chained event asynchronously
								processAutomations({
									event: newEvent as AutomationEventPayload['event'],
									projectId: payload.projectId,
									taskId: payload.taskId,
									task: updatedTask as unknown as Record<string, unknown>,
									changes: { [(action as { field: string }).field]: (action as { value: unknown }).value },
									userId: payload.userId,
									chainDepth: depth + 1
								}).catch(() => {});
							}
						}
					}
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					actionsRun.push({ action: action.type, result: 'error', error: errorMsg });
					execStatus = 'error';
					execError = errorMsg;
				}
			}
		} catch (err) {
			execStatus = 'error';
			execError = err instanceof Error ? err.message : String(err);
		}

		await logExecution(rule.id, payload.taskId, payload.event, execStatus, actionsRun, execError, Date.now() - start);
	}
}

function matchesTrigger(trigger: TriggerDef, payload: AutomationEventPayload): boolean {
	if (trigger.event !== payload.event) return false;

	if (trigger.config) {
		// For status_changed: optionally filter by target status
		if (trigger.event === 'task.status_changed' && trigger.config.statusId) {
			const newStatus = payload.changes?.statusId ?? payload.task.statusId;
			if (newStatus !== trigger.config.statusId) return false;
		}
		// For priority_changed: optionally filter by target priority
		if (trigger.event === 'task.priority_changed' && trigger.config.priority) {
			const newPriority = payload.changes?.priority ?? payload.task.priority;
			if (newPriority !== trigger.config.priority) return false;
		}
	}

	return true;
}

async function evaluateConditions(
	groups: ConditionGroup[],
	task: Record<string, unknown>,
	taskId: string
): Promise<boolean> {
	// All groups must pass (groups are AND-ed together)
	for (const group of groups) {
		const results = await Promise.all(group.conditions.map((c) => evaluateCondition(c, task, taskId)));
		const passed = group.logic === 'and' ? results.every(Boolean) : results.some(Boolean);
		if (!passed) return false;
	}
	return true;
}

async function evaluateCondition(condition: Condition, task: Record<string, unknown>, taskId: string): Promise<boolean> {
	let fieldValue: unknown;

	if (condition.field === 'labelIds') {
		const labels = await db
			.select({ labelId: taskLabelAssignments.labelId })
			.from(taskLabelAssignments)
			.where(eq(taskLabelAssignments.taskId, taskId));
		fieldValue = labels.map((l) => l.labelId);
	} else {
		fieldValue = task[condition.field];
	}

	const cv = condition.value;

	switch (condition.operator) {
		case 'equals':
			return String(fieldValue) === String(cv);
		case 'not_equals':
			return String(fieldValue) !== String(cv);
		case 'contains': {
			if (Array.isArray(fieldValue)) return fieldValue.includes(cv);
			return String(fieldValue).includes(String(cv));
		}
		case 'not_contains': {
			if (Array.isArray(fieldValue)) return !fieldValue.includes(cv);
			return !String(fieldValue).includes(String(cv));
		}
		case 'in': {
			const arr = Array.isArray(cv) ? cv : [cv];
			return arr.includes(String(fieldValue));
		}
		case 'not_in': {
			const arr = Array.isArray(cv) ? cv : [cv];
			return !arr.includes(String(fieldValue));
		}
		case 'is_set':
			return fieldValue != null && fieldValue !== '';
		case 'is_not_set':
			return fieldValue == null || fieldValue === '';
		default:
			return false;
	}
}

async function logExecution(
	ruleId: string,
	taskId: string,
	triggerEvent: string,
	status: 'success' | 'error' | 'skipped',
	actionsRun: ActionResult[],
	error: string | null,
	durationMs: number
) {
	await db.insert(automationExecutions).values({
		id: nanoid(12),
		ruleId,
		taskId,
		triggerEvent,
		status,
		actionsRun: JSON.stringify(actionsRun),
		error,
		durationMs,
		createdAt: Date.now()
	});
}
