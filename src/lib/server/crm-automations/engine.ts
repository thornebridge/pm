import { db } from '../db/index.js';
import { crmAutomationRules, crmAutomationExecutions, crmOpportunities } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { executeCrmAction } from './actions.js';
import type {
	CrmAutomationPayload, CrmAutomationRule, CrmTriggerDef,
	CrmConditionGroup, CrmCondition, CrmActionDef, CrmActionResult, CrmActionType
} from './types.js';
import { CRM_MAX_CHAIN_DEPTH, CRM_TERMINAL_ACTIONS } from './types.js';

export async function processCrmAutomations(payload: CrmAutomationPayload): Promise<void> {
	const depth = payload.chainDepth ?? 0;
	if (depth >= CRM_MAX_CHAIN_DEPTH) return;

	const rules = await db
		.select()
		.from(crmAutomationRules)
		.where(and(
			eq(crmAutomationRules.entityType, payload.entityType),
			eq(crmAutomationRules.enabled, true)
		));

	for (const row of rules) {
		let rule: CrmAutomationRule;
		try {
			rule = {
				id: row.id,
				name: row.name,
				entityType: row.entityType,
				trigger: JSON.parse(row.trigger) as CrmTriggerDef,
				conditions: row.conditions ? JSON.parse(row.conditions) as CrmConditionGroup[] : null,
				actions: JSON.parse(row.actions) as CrmActionDef[],
				enabled: row.enabled
			};
		} catch {
			continue;
		}

		if (!matchesTrigger(rule.trigger, payload)) continue;

		const start = Date.now();
		const actionsRun: CrmActionResult[] = [];
		let execStatus: 'success' | 'error' | 'skipped' = 'success';
		let execError: string | null = null;

		try {
			// Evaluate conditions
			if (rule.conditions && rule.conditions.length > 0) {
				const conditionsMet = evaluateConditions(rule.conditions, payload.entity);
				if (!conditionsMet) {
					execStatus = 'skipped';
					await logExecution(rule.id, payload.entityType, payload.entityId, payload.event, execStatus, actionsRun, null, Date.now() - start);
					continue;
				}
			}

			// Execute actions
			for (const action of rule.actions) {
				try {
					const result = await executeCrmAction(action, payload);
					actionsRun.push(result);

					// Re-emit events for field mutations (non-terminal only)
					if (
						!CRM_TERMINAL_ACTIONS.includes(action.type as CrmActionType) &&
						action.type === 'set_field' &&
						payload.entityType === 'opportunity'
					) {
						const [updatedOpp] = await db.select().from(crmOpportunities).where(eq(crmOpportunities.id, payload.entityId));
						if (updatedOpp) {
							const fieldToEvent: Record<string, string> = {
								stageId: 'opportunity.stage_changed',
								priority: 'opportunity.priority_changed',
								ownerId: 'opportunity.owner_changed',
								value: 'opportunity.value_changed'
							};
							const newEvent = fieldToEvent[(action as { field: string }).field];
							if (newEvent) {
								processCrmAutomations({
									event: newEvent as CrmAutomationPayload['event'],
									entityType: 'opportunity',
									entityId: payload.entityId,
									entity: updatedOpp as unknown as Record<string, unknown>,
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

		await logExecution(rule.id, payload.entityType, payload.entityId, payload.event, execStatus, actionsRun, execError, Date.now() - start);
	}
}

function matchesTrigger(trigger: CrmTriggerDef, payload: CrmAutomationPayload): boolean {
	if (trigger.event !== payload.event) return false;

	if (trigger.config) {
		if (trigger.event === 'opportunity.stage_changed' && trigger.config.stageId) {
			const newStage = payload.changes?.stageId ?? payload.entity.stageId;
			if (newStage !== trigger.config.stageId) return false;
		}
		if (trigger.event === 'opportunity.priority_changed' && trigger.config.priority) {
			const newPriority = payload.changes?.priority ?? payload.entity.priority;
			if (newPriority !== trigger.config.priority) return false;
		}
		if (trigger.event === 'activity.logged' && trigger.config.activityType) {
			const activityType = payload.entity.type;
			if (activityType !== trigger.config.activityType) return false;
		}
	}

	return true;
}

function evaluateConditions(
	groups: CrmConditionGroup[],
	entity: Record<string, unknown>
): boolean {
	for (const group of groups) {
		const results = group.conditions.map((c) => evaluateCondition(c, entity));
		const passed = group.logic === 'and' ? results.every(Boolean) : results.some(Boolean);
		if (!passed) return false;
	}
	return true;
}

function evaluateCondition(condition: CrmCondition, entity: Record<string, unknown>): boolean {
	const fieldValue = entity[condition.field];
	const cv = condition.value;

	switch (condition.operator) {
		case 'equals':
			return String(fieldValue) === String(cv);
		case 'not_equals':
			return String(fieldValue) !== String(cv);
		case 'contains':
			return String(fieldValue ?? '').includes(String(cv));
		case 'not_contains':
			return !String(fieldValue ?? '').includes(String(cv));
		case 'greater_than':
			return Number(fieldValue) > Number(cv);
		case 'less_than':
			return Number(fieldValue) < Number(cv);
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
	entityType: string,
	entityId: string,
	triggerEvent: string,
	status: 'success' | 'error' | 'skipped',
	actionsRun: CrmActionResult[],
	error: string | null,
	durationMs: number
) {
	await db.insert(crmAutomationExecutions).values({
		id: nanoid(12),
		ruleId,
		entityType,
		entityId,
		triggerEvent,
		status,
		actionsRun: JSON.stringify(actionsRun),
		error,
		durationMs,
		createdAt: Date.now()
	});
}
