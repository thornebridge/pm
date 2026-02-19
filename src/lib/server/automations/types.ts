// ─── Trigger Types ───────────────────────────────────────────────────────────

export type TriggerEvent =
	| 'task.created'
	| 'task.deleted'
	| 'task.status_changed'
	| 'task.priority_changed'
	| 'task.assigned'
	| 'task.due_date_changed'
	| 'task.type_changed'
	| 'comment.added'
	| 'label.added'
	| 'label.removed'
	| 'due_date.approaching'
	| 'checklist.completed';

export interface TriggerDef {
	event: TriggerEvent;
	config?: {
		statusId?: string;
		priority?: string;
		hoursBefore?: number;
	};
}

// ─── Condition Types ─────────────────────────────────────────────────────────

export type ConditionOperator =
	| 'equals'
	| 'not_equals'
	| 'contains'
	| 'not_contains'
	| 'in'
	| 'not_in'
	| 'is_set'
	| 'is_not_set';

export type ConditionField =
	| 'statusId'
	| 'priority'
	| 'assigneeId'
	| 'type'
	| 'labelIds'
	| 'sprintId';

export interface Condition {
	field: ConditionField;
	operator: ConditionOperator;
	value?: string | string[];
}

export interface ConditionGroup {
	logic: 'and' | 'or';
	conditions: Condition[];
}

// ─── Action Types ────────────────────────────────────────────────────────────

export type ActionType =
	| 'set_field'
	| 'add_label'
	| 'remove_label'
	| 'add_comment'
	| 'send_notification'
	| 'fire_webhook';

export interface ActionSetField {
	type: 'set_field';
	field: string;
	value: string | null;
}

export interface ActionAddLabel {
	type: 'add_label';
	labelId: string;
}

export interface ActionRemoveLabel {
	type: 'remove_label';
	labelId: string;
}

export interface ActionAddComment {
	type: 'add_comment';
	body: string; // supports {{task.title}}, {{task.number}} templates
}

export interface ActionSendNotification {
	type: 'send_notification';
	target: string; // userId, 'assignee', or 'creator'
	title: string;
	body: string;
}

export interface ActionFireWebhook {
	type: 'fire_webhook';
	url: string;
	secret?: string;
}

export type ActionDef =
	| ActionSetField
	| ActionAddLabel
	| ActionRemoveLabel
	| ActionAddComment
	| ActionSendNotification
	| ActionFireWebhook;

// ─── Event Payload ───────────────────────────────────────────────────────────

export interface AutomationEventPayload {
	event: TriggerEvent;
	projectId: string;
	taskId: string;
	task: Record<string, unknown>;
	changes?: Record<string, unknown>;
	userId: string;
	chainDepth?: number;
}

// ─── Rule Shape (parsed from DB) ─────────────────────────────────────────────

export interface AutomationRule {
	id: string;
	projectId: string;
	name: string;
	trigger: TriggerDef;
	conditions: ConditionGroup[] | null;
	actions: ActionDef[];
	enabled: boolean;
}

// ─── Execution Result ────────────────────────────────────────────────────────

export interface ActionResult {
	action: string;
	result: string;
	error?: string;
}

// Terminal actions that don't re-emit events (loop prevention)
export const TERMINAL_ACTIONS: ActionType[] = ['add_comment', 'send_notification', 'fire_webhook'];

export const MAX_CHAIN_DEPTH = 3;
