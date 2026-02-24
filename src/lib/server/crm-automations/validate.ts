import type { CrmTriggerDef, CrmConditionGroup, CrmActionDef, CrmTriggerEvent, CrmConditionOperator, CrmConditionField } from './types.js';

const VALID_TRIGGERS: CrmTriggerEvent[] = [
	'opportunity.created', 'opportunity.stage_changed', 'opportunity.priority_changed',
	'opportunity.owner_changed', 'opportunity.value_changed',
	'opportunity.won', 'opportunity.lost',
	'contact.created', 'company.created', 'activity.logged',
	'deal.stale', 'deal.no_next_step', 'close_date.approaching'
];

const VALID_OPERATORS: CrmConditionOperator[] = [
	'equals', 'not_equals', 'contains', 'not_contains',
	'greater_than', 'less_than', 'is_set', 'is_not_set'
];

const VALID_FIELDS: CrmConditionField[] = [
	'stageId', 'priority', 'ownerId', 'source', 'value', 'probability', 'companyId', 'nextStep'
];

const VALID_ACTION_TYPES = ['set_field', 'log_activity', 'create_task', 'send_notification', 'fire_webhook'];

const SETTABLE_FIELDS = ['stageId', 'priority', 'ownerId', 'value', 'probability', 'nextStep', 'nextStepDueDate', 'source'];

export function validateCrmRule(data: {
	name?: string;
	trigger?: unknown;
	conditions?: unknown;
	actions?: unknown;
}): string | null {
	if (!data.name?.trim()) return 'Name is required';

	const trigger = data.trigger as CrmTriggerDef;
	if (!trigger || !trigger.event) return 'Trigger event is required';
	if (!VALID_TRIGGERS.includes(trigger.event)) return `Invalid trigger event: ${trigger.event}`;

	if (trigger.event === 'deal.stale' && trigger.config?.staleDays !== undefined) {
		if (typeof trigger.config.staleDays !== 'number' || trigger.config.staleDays < 1) {
			return 'staleDays must be a positive number';
		}
	}
	if (trigger.event === 'close_date.approaching' && trigger.config?.daysBefore !== undefined) {
		if (typeof trigger.config.daysBefore !== 'number' || trigger.config.daysBefore < 1) {
			return 'daysBefore must be a positive number';
		}
	}

	if (data.conditions != null) {
		const groups = data.conditions as CrmConditionGroup[];
		if (!Array.isArray(groups)) return 'Conditions must be an array';
		for (const group of groups) {
			if (!group.logic || !['and', 'or'].includes(group.logic)) return 'Condition group logic must be "and" or "or"';
			if (!Array.isArray(group.conditions)) return 'Condition group must have conditions array';
			for (const c of group.conditions) {
				if (!VALID_FIELDS.includes(c.field)) return `Invalid condition field: ${c.field}`;
				if (!VALID_OPERATORS.includes(c.operator)) return `Invalid operator: ${c.operator}`;
			}
		}
	}

	const actions = data.actions as CrmActionDef[];
	if (!Array.isArray(actions) || actions.length === 0) return 'At least one action is required';

	for (const action of actions) {
		if (!VALID_ACTION_TYPES.includes(action.type)) return `Invalid action type: ${action.type}`;

		switch (action.type) {
			case 'set_field':
				if (!SETTABLE_FIELDS.includes(action.field)) return `Cannot set field: ${action.field}`;
				break;
			case 'log_activity':
				if (!action.subject?.trim()) return 'log_activity requires subject';
				break;
			case 'create_task':
				if (!action.title?.trim()) return 'create_task requires title';
				if (typeof action.daysFromNow !== 'number' || action.daysFromNow < 0) return 'create_task requires valid daysFromNow';
				break;
			case 'send_notification':
				if (!action.target) return 'send_notification requires target';
				if (!action.title?.trim()) return 'send_notification requires title';
				break;
			case 'fire_webhook':
				if (!action.url) return 'fire_webhook requires url';
				try { new URL(action.url); } catch { return 'fire_webhook url is invalid'; }
				break;
		}
	}

	return null;
}
