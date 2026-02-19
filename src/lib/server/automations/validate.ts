import type { TriggerDef, ConditionGroup, ActionDef, TriggerEvent, ConditionOperator, ConditionField } from './types.js';

const VALID_TRIGGERS: TriggerEvent[] = [
	'task.created', 'task.deleted',
	'task.status_changed', 'task.priority_changed', 'task.assigned',
	'task.due_date_changed', 'task.type_changed',
	'comment.added', 'label.added', 'label.removed',
	'due_date.approaching', 'checklist.completed'
];

const VALID_OPERATORS: ConditionOperator[] = [
	'equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', 'is_set', 'is_not_set'
];

const VALID_FIELDS: ConditionField[] = [
	'statusId', 'priority', 'assigneeId', 'type', 'labelIds', 'sprintId'
];

const VALID_ACTION_TYPES = ['set_field', 'add_label', 'remove_label', 'add_comment', 'send_notification', 'fire_webhook'];

const SETTABLE_FIELDS = ['statusId', 'priority', 'assigneeId', 'type', 'dueDate', 'sprintId'];

export function validateRule(data: {
	name?: string;
	trigger?: unknown;
	conditions?: unknown;
	actions?: unknown;
}): string | null {
	if (!data.name?.trim()) return 'Name is required';

	// Validate trigger
	const trigger = data.trigger as TriggerDef;
	if (!trigger || !trigger.event) return 'Trigger event is required';
	if (!VALID_TRIGGERS.includes(trigger.event)) return `Invalid trigger event: ${trigger.event}`;

	if (trigger.event === 'due_date.approaching' && trigger.config?.hoursBefore !== undefined) {
		if (typeof trigger.config.hoursBefore !== 'number' || trigger.config.hoursBefore < 1) {
			return 'hoursBefore must be a positive number';
		}
	}

	// Validate conditions (optional)
	if (data.conditions != null) {
		const groups = data.conditions as ConditionGroup[];
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

	// Validate actions
	const actions = data.actions as ActionDef[];
	if (!Array.isArray(actions) || actions.length === 0) return 'At least one action is required';

	for (const action of actions) {
		if (!VALID_ACTION_TYPES.includes(action.type)) return `Invalid action type: ${action.type}`;

		switch (action.type) {
			case 'set_field':
				if (!SETTABLE_FIELDS.includes(action.field)) return `Cannot set field: ${action.field}`;
				break;
			case 'add_label':
			case 'remove_label':
				if (!action.labelId) return `${action.type} requires labelId`;
				break;
			case 'add_comment':
				if (!action.body?.trim()) return 'add_comment requires body';
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
