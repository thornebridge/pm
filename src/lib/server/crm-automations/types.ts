// ─── CRM Trigger Events ─────────────────────────────────────────────────────

export type CrmTriggerEvent =
	| 'opportunity.created'
	| 'opportunity.stage_changed'
	| 'opportunity.priority_changed'
	| 'opportunity.owner_changed'
	| 'opportunity.value_changed'
	| 'opportunity.won'
	| 'opportunity.lost'
	| 'contact.created'
	| 'company.created'
	| 'activity.logged'
	| 'lead.created'
	| 'lead.status_changed'
	| 'lead.converted'
	| 'lead.owner_changed'
	| 'deal.stale'        // polling: no activity in X days
	| 'deal.no_next_step' // polling: no next step set
	| 'close_date.approaching'; // polling: expected close date approaching

export interface CrmTriggerDef {
	event: CrmTriggerEvent;
	config?: {
		stageId?: string;       // filter by target stage
		priority?: string;      // filter by target priority
		activityType?: string;  // filter activity type (call, email, meeting, note)
		staleDays?: number;     // for deal.stale (default: 7)
		daysBefore?: number;    // for close_date.approaching (default: 7)
	};
}

// ─── CRM Condition Types ────────────────────────────────────────────────────

export type CrmConditionOperator =
	| 'equals'
	| 'not_equals'
	| 'contains'
	| 'not_contains'
	| 'greater_than'
	| 'less_than'
	| 'is_set'
	| 'is_not_set';

export type CrmConditionField =
	| 'stageId'
	| 'statusId'
	| 'priority'
	| 'ownerId'
	| 'source'
	| 'value'
	| 'probability'
	| 'companyId'
	| 'nextStep';

export interface CrmCondition {
	field: CrmConditionField;
	operator: CrmConditionOperator;
	value?: string | number;
}

export interface CrmConditionGroup {
	logic: 'and' | 'or';
	conditions: CrmCondition[];
}

// ─── CRM Action Types ───────────────────────────────────────────────────────

export type CrmActionType =
	| 'set_field'
	| 'log_activity'
	| 'create_task'
	| 'send_notification'
	| 'fire_webhook';

export interface CrmActionSetField {
	type: 'set_field';
	field: string;
	value: string | number | null;
}

export interface CrmActionLogActivity {
	type: 'log_activity';
	activityType: 'note' | 'call' | 'email' | 'meeting';
	subject: string;  // supports {{opp.title}}, {{company.name}} templates
}

export interface CrmActionCreateTask {
	type: 'create_task';
	title: string;     // supports templates
	daysFromNow: number;
	priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CrmActionSendNotification {
	type: 'send_notification';
	target: string; // 'owner' or userId
	title: string;
	body: string;
}

export interface CrmActionFireWebhook {
	type: 'fire_webhook';
	url: string;
	secret?: string;
}

export type CrmActionDef =
	| CrmActionSetField
	| CrmActionLogActivity
	| CrmActionCreateTask
	| CrmActionSendNotification
	| CrmActionFireWebhook;

// ─── Event Payload ──────────────────────────────────────────────────────────

export interface CrmAutomationPayload {
	event: CrmTriggerEvent;
	entityType: 'opportunity' | 'contact' | 'company' | 'activity' | 'lead';
	entityId: string;
	entity: Record<string, unknown>;
	changes?: Record<string, unknown>;
	userId: string;
	chainDepth?: number;
}

// ─── Rule Shape (parsed from DB) ────────────────────────────────────────────

export interface CrmAutomationRule {
	id: string;
	name: string;
	entityType: string;
	trigger: CrmTriggerDef;
	conditions: CrmConditionGroup[] | null;
	actions: CrmActionDef[];
	enabled: boolean;
}

// ─── Execution Result ───────────────────────────────────────────────────────

export interface CrmActionResult {
	action: string;
	result: string;
	error?: string;
}

// Terminal actions that don't re-emit events (loop prevention)
export const CRM_TERMINAL_ACTIONS: CrmActionType[] = [
	'log_activity', 'create_task', 'send_notification', 'fire_webhook'
];

export const CRM_MAX_CHAIN_DEPTH = 3;
