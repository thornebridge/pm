import { pgTable, text, integer, bigint, boolean, doublePrecision, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
	activeThemeId: text('active_theme_id'),
	createdAt: bigint('created_at', { mode: 'number' }).notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
	createdAt: bigint('created_at', { mode: 'number' }).notNull()
});

export const inviteTokens = pgTable('invite_tokens', {
	id: text('id').primaryKey(),
	token: text('token').notNull().unique(),
	email: text('email'),
	role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	usedBy: text('used_by').references(() => users.id),
	expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
	usedAt: bigint('used_at', { mode: 'number' }),
	createdAt: bigint('created_at', { mode: 'number' }).notNull()
});

// ─── Folders ──────────────────────────────────────────────────────────────────

export const folders = pgTable('folders', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	parentId: text('parent_id'),
	color: text('color'),
	position: integer('position').notNull().default(0),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: bigint('created_at', { mode: 'number' }).notNull()
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	color: text('color').notNull().default('#2d4f3e'),
	folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
	archived: boolean('archived').notNull().default(false),
	readme: text('readme'),
	defaultAssigneeId: text('default_assignee_id').references(() => users.id, { onDelete: 'set null' }),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: bigint('created_at', { mode: 'number' }).notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const taskStatuses = pgTable(
	'task_statuses',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color').notNull(),
		position: integer('position').notNull(),
		isClosed: boolean('is_closed').notNull().default(false),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_statuses_project').on(table.projectId, table.position)]
);

// ─── Sprints ──────────────────────────────────────────────────────────────────

export const sprints = pgTable(
	'sprints',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		goal: text('goal'),
		startDate: bigint('start_date', { mode: 'number' }),
		endDate: bigint('end_date', { mode: 'number' }),
		status: text('status', { enum: ['planning', 'active', 'completed', 'cancelled'] })
			.notNull()
			.default('planning'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_sprints_project').on(table.projectId, table.status)]
);

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = pgTable(
	'tasks',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		number: integer('number').notNull(),
		title: text('title').notNull(),
		description: text('description'),
		statusId: text('status_id')
			.notNull()
			.references(() => taskStatuses.id),
		type: text('type', { enum: ['task', 'bug', 'feature', 'improvement'] }).notNull().default('task'),
		priority: text('priority', { enum: ['urgent', 'high', 'medium', 'low'] })
			.notNull()
			.default('medium'),
		assigneeId: text('assignee_id').references(() => users.id),
		parentId: text('parent_id'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		dueDate: bigint('due_date', { mode: 'number' }),
		startDate: bigint('start_date', { mode: 'number' }),
		sprintId: text('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
		estimatePoints: integer('estimate_points'),
		recurrence: text('recurrence'), // JSON: { freq, interval, endDate? }
		recurrenceSourceId: text('recurrence_source_id'),
		position: doublePrecision('position').notNull(),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_tasks_board').on(table.projectId, table.statusId, table.position),
		uniqueIndex('idx_tasks_number').on(table.projectId, table.number),
		index('idx_tasks_assignee').on(table.assigneeId),
		index('idx_tasks_sprint').on(table.sprintId),
		index('idx_tasks_parent').on(table.parentId)
	]
);

export const taskLabels = pgTable('task_labels', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	color: text('color').notNull(),
	createdAt: bigint('created_at', { mode: 'number' }).notNull()
});

export const taskLabelAssignments = pgTable(
	'task_label_assignments',
	{
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		labelId: text('label_id')
			.notNull()
			.references(() => taskLabels.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.taskId, table.labelId] })]
);

// ─── Checklist Items ─────────────────────────────────────────────────────────

export const checklistItems = pgTable(
	'checklist_items',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		completed: boolean('completed').notNull().default(false),
		position: integer('position').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_checklist_task').on(table.taskId, table.position)]
);

// ─── Task Dependencies ───────────────────────────────────────────────────────

export const taskDependencies = pgTable(
	'task_dependencies',
	{
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		dependsOnTaskId: text('depends_on_task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['blocks', 'blocked_by'] }).notNull().default('blocks')
	},
	(table) => [
		primaryKey({ columns: [table.taskId, table.dependsOnTaskId] }),
		index('idx_deps_depends_on').on(table.dependsOnTaskId)
	]
);

// ─── Attachments ─────────────────────────────────────────────────────────────

export const attachments = pgTable(
	'attachments',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		filename: text('filename').notNull(),
		originalName: text('original_name').notNull(),
		mimeType: text('mime_type').notNull(),
		size: integer('size').notNull(),
		storagePath: text('storage_path').notNull(),
		uploadedBy: text('uploaded_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_attachments_task').on(table.taskId)]
);

// ─── Collaboration ────────────────────────────────────────────────────────────

export const comments = pgTable(
	'comments',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		body: text('body').notNull(),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_comments_task').on(table.taskId, table.createdAt)]
);

export const commentReactions = pgTable(
	'comment_reactions',
	{
		commentId: text('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		emoji: text('emoji').notNull(),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		primaryKey({ columns: [table.commentId, table.userId, table.emoji] }),
		index('idx_reactions_comment').on(table.commentId)
	]
);

export const activityLog = pgTable(
	'activity_log',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		action: text('action', {
			enum: [
				'created',
				'status_changed',
				'assigned',
				'priority_changed',
				'commented',
				'label_added',
				'label_removed',
				'edited',
				'attachment_added',
				'attachment_removed'
			]
		}).notNull(),
		detail: text('detail'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_activity_task').on(table.taskId, table.createdAt)]
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	keysP256dh: text('keys_p256dh').notNull(),
	keysAuth: text('keys_auth').notNull(),
	createdAt: bigint('created_at', { mode: 'number' }).notNull()
});

export const notificationPreferences = pgTable('notification_preferences', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
		.unique(),
	onAssigned: boolean('on_assigned').notNull().default(true),
	onStatusChange: boolean('on_status_change').notNull().default(true),
	onComment: boolean('on_comment').notNull().default(true),
	onMention: boolean('on_mention').notNull().default(true),
	emailEnabled: boolean('email_enabled').notNull().default(true),
	reminderDueSoon: boolean('reminder_due_soon').notNull().default(true),
	reminderDueToday: boolean('reminder_due_today').notNull().default(true),
	reminderOverdue: boolean('reminder_overdue').notNull().default(true),
	dueDateEmailMode: text('due_date_email_mode', { enum: ['off', 'each', 'daily', 'weekly'] }).notNull().default('off'),
	digestDay: integer('digest_day').notNull().default(1),
	digestHour: integer('digest_hour').notNull().default(8),
	lastDigestSentAt: bigint('last_digest_sent_at', { mode: 'number' }).notNull().default(0)
});

// ─── In-App Notifications ────────────────────────────────────────────────────

export const notifications = pgTable(
	'notifications',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['mention', 'assigned', 'status_change', 'comment', 'due_day_before', 'due_soon', 'overdue'] }).notNull(),
		title: text('title').notNull(),
		body: text('body'),
		url: text('url'),
		taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
		actorId: text('actor_id').references(() => users.id),
		read: boolean('read').notNull().default(false),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_notifications_user').on(table.userId, table.read, table.createdAt)
	]
);

// ─── Time Tracking ───────────────────────────────────────────────────────────

export const timeEntries = pgTable(
	'time_entries',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		description: text('description'),
		startedAt: bigint('started_at', { mode: 'number' }).notNull(),
		stoppedAt: bigint('stopped_at', { mode: 'number' }),
		durationMs: integer('duration_ms'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_time_entries_task').on(table.taskId)]
);

// ─── Task Templates ──────────────────────────────────────────────────────────

export const taskTemplates = pgTable('task_templates', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	type: text('type', { enum: ['task', 'bug', 'feature', 'improvement'] }).default('task'),
	priority: text('priority', { enum: ['urgent', 'high', 'medium', 'low'] }).default('medium'),
	labelIds: text('label_ids'),
	createdAt: bigint('created_at', { mode: 'number' }).notNull()
});

// ─── Saved Views ─────────────────────────────────────────────────────────────

export const savedViews = pgTable(
	'saved_views',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		filters: text('filters').notNull(), // JSON string: SavedViewData
		shared: boolean('shared').notNull().default(false),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_views_project_user').on(table.projectId, table.userId)]
);

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const webhooks = pgTable(
	'webhooks',
	{
		id: text('id').primaryKey(),
		url: text('url').notNull(),
		secret: text('secret'),
		events: text('events').notNull(), // JSON array: ["task.created", "task.updated", ...]
		active: boolean('active').notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	}
);

// ─── Task Watchers ──────────────────────────────────────────────────────────

export const taskWatchers = pgTable(
	'task_watchers',
	{
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		primaryKey({ columns: [table.taskId, table.userId] })
	]
);

// ─── Sprint Snapshots ────────────────────────────────────────────────────────

export const sprintSnapshots = pgTable(
	'sprint_snapshots',
	{
		id: text('id').primaryKey(),
		sprintId: text('sprint_id')
			.notNull()
			.references(() => sprints.id, { onDelete: 'cascade' }),
		date: bigint('date', { mode: 'number' }).notNull(),
		totalTasks: integer('total_tasks').notNull(),
		completedTasks: integer('completed_tasks').notNull(),
		totalPoints: integer('total_points').notNull().default(0),
		completedPoints: integer('completed_points').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_snapshots_sprint').on(table.sprintId, table.date)]
);

// ─── Automation Rules ────────────────────────────────────────────────────────

export const automationRules = pgTable(
	'automation_rules',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		trigger: text('trigger').notNull(), // JSON: { event, config? }
		conditions: text('conditions'), // JSON: [{ field, operator, value }] or null
		actions: text('actions').notNull(), // JSON: [{ type, ...config }]
		enabled: boolean('enabled').notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_automation_rules_project').on(table.projectId, table.enabled)]
);

export const automationExecutions = pgTable(
	'automation_executions',
	{
		id: text('id').primaryKey(),
		ruleId: text('rule_id')
			.notNull()
			.references(() => automationRules.id, { onDelete: 'cascade' }),
		taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
		triggerEvent: text('trigger_event').notNull(),
		status: text('status', { enum: ['success', 'error', 'skipped'] }).notNull(),
		actionsRun: text('actions_run'), // JSON: [{ action, result, error? }]
		error: text('error'),
		durationMs: integer('duration_ms'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_automation_exec_rule').on(table.ruleId, table.createdAt),
		index('idx_automation_exec_task').on(table.taskId)
	]
);

// ─── Due Date Reminder Tracking ──────────────────────────────────────────────

export const dueDateRemindersSent = pgTable(
	'due_date_reminders_sent',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		tier: text('tier', { enum: ['day_before', 'day_of', 'overdue'] }).notNull(),
		sentAt: bigint('sent_at', { mode: 'number' }).notNull()
	},
	(table) => [
		uniqueIndex('idx_reminders_unique').on(table.userId, table.taskId, table.tier),
		index('idx_reminders_task').on(table.taskId)
	]
);

// ─── CRM ─────────────────────────────────────────────────────────────────────

export const crmCompanies = pgTable(
	'crm_companies',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		website: text('website'),
		industry: text('industry'),
		size: text('size', { enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] }),
		phone: text('phone'),
		address: text('address'),
		city: text('city'),
		state: text('state'),
		country: text('country').default('US'),
		notes: text('notes'),
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_companies_owner').on(t.ownerId)]
);

export const crmLeadStatuses = pgTable(
	'crm_lead_statuses',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		color: text('color').notNull(),
		position: integer('position').notNull(),
		isConverted: boolean('is_converted').notNull().default(false),
		isDisqualified: boolean('is_disqualified').notNull().default(false),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_lead_statuses_position').on(t.position)]
);

export const crmLeads = pgTable(
	'crm_leads',
	{
		id: text('id').primaryKey(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		email: text('email'),
		phone: text('phone'),
		title: text('title'),
		companyName: text('company_name'),
		website: text('website'),
		industry: text('industry'),
		companySize: text('company_size', { enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] }),
		address: text('address'),
		source: text('source', {
			enum: ['referral', 'inbound', 'outbound', 'website', 'event', 'csv_import', 'other']
		}),
		statusId: text('status_id')
			.notNull()
			.references(() => crmLeadStatuses.id),
		notes: text('notes'),
		convertedAt: bigint('converted_at', { mode: 'number' }),
		convertedCompanyId: text('converted_company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		convertedContactId: text('converted_contact_id'),
		convertedOpportunityId: text('converted_opportunity_id'),
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_leads_status').on(t.statusId),
		index('idx_crm_leads_owner').on(t.ownerId),
		index('idx_crm_leads_email').on(t.email),
		index('idx_crm_leads_converted').on(t.convertedAt)
	]
);

export const crmContacts = pgTable(
	'crm_contacts',
	{
		id: text('id').primaryKey(),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		email: text('email'),
		phone: text('phone'),
		title: text('title'),
		isPrimary: boolean('is_primary').notNull().default(false),
		source: text('source', {
			enum: ['referral', 'inbound', 'outbound', 'website', 'event', 'other']
		}),
		notes: text('notes'),
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_contacts_company').on(t.companyId),
		index('idx_crm_contacts_owner').on(t.ownerId),
		index('idx_crm_contacts_email').on(t.email)
	]
);

export const crmPipelineStages = pgTable(
	'crm_pipeline_stages',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		color: text('color').notNull(),
		position: integer('position').notNull(),
		isClosed: boolean('is_closed').notNull().default(false),
		isWon: boolean('is_won').notNull().default(false),
		probability: integer('probability').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_stages_position').on(t.position)]
);

export const crmOpportunities = pgTable(
	'crm_opportunities',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		companyId: text('company_id')
			.notNull()
			.references(() => crmCompanies.id, { onDelete: 'cascade' }),
		contactId: text('contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
		stageId: text('stage_id')
			.notNull()
			.references(() => crmPipelineStages.id),
		value: integer('value'),
		currency: text('currency').notNull().default('USD'),
		probability: integer('probability'),
		expectedCloseDate: bigint('expected_close_date', { mode: 'number' }),
		actualCloseDate: bigint('actual_close_date', { mode: 'number' }),
		priority: text('priority', { enum: ['hot', 'warm', 'cold'] }).notNull().default('warm'),
		source: text('source', {
			enum: ['referral', 'inbound', 'outbound', 'website', 'event', 'partner', 'other']
		}),
		description: text('description'),
		lostReason: text('lost_reason'),
		forecastCategory: text('forecast_category', {
			enum: ['commit', 'best_case', 'upside', 'pipeline', 'omit']
		}),
		nextStep: text('next_step'),
		nextStepDueDate: bigint('next_step_due_date', { mode: 'number' }),
		stageEnteredAt: bigint('stage_entered_at', { mode: 'number' }),
		position: doublePrecision('position').notNull(),
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_opps_company').on(t.companyId),
		index('idx_crm_opps_stage').on(t.stageId, t.position),
		index('idx_crm_opps_owner').on(t.ownerId),
		index('idx_crm_opps_close').on(t.expectedCloseDate)
	]
);

export const crmOpportunityContacts = pgTable(
	'crm_opportunity_contacts',
	{
		opportunityId: text('opportunity_id')
			.notNull()
			.references(() => crmOpportunities.id, { onDelete: 'cascade' }),
		contactId: text('contact_id')
			.notNull()
			.references(() => crmContacts.id, { onDelete: 'cascade' }),
		role: text('role'),
		influence: text('influence', { enum: ['high', 'medium', 'low'] }),
		sentiment: text('sentiment', { enum: ['champion', 'supportive', 'neutral', 'skeptical', 'blocker'] }),
		notes: text('notes')
	},
	(t) => [primaryKey({ columns: [t.opportunityId, t.contactId] })]
);

export const crmActivities = pgTable(
	'crm_activities',
	{
		id: text('id').primaryKey(),
		type: text('type', { enum: ['call', 'email', 'meeting', 'note'] }).notNull(),
		subject: text('subject').notNull(),
		description: text('description'),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		contactId: text('contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
		opportunityId: text('opportunity_id').references(() => crmOpportunities.id, {
			onDelete: 'set null'
		}),
		leadId: text('lead_id').references(() => crmLeads.id, { onDelete: 'set null' }),
		scheduledAt: bigint('scheduled_at', { mode: 'number' }),
		completedAt: bigint('completed_at', { mode: 'number' }),
		durationMinutes: integer('duration_minutes'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_act_company').on(t.companyId),
		index('idx_crm_act_contact').on(t.contactId),
		index('idx_crm_act_opp').on(t.opportunityId),
		index('idx_crm_act_lead').on(t.leadId),
		index('idx_crm_act_user_date').on(t.userId, t.createdAt)
	]
);

export const crmTasks = pgTable(
	'crm_tasks',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		description: text('description'),
		dueDate: bigint('due_date', { mode: 'number' }),
		completedAt: bigint('completed_at', { mode: 'number' }),
		priority: text('priority', { enum: ['urgent', 'high', 'medium', 'low'] })
			.notNull()
			.default('medium'),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		contactId: text('contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
		opportunityId: text('opportunity_id').references(() => crmOpportunities.id, {
			onDelete: 'set null'
		}),
		assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_tasks_assignee').on(t.assigneeId, t.completedAt),
		index('idx_crm_tasks_due').on(t.dueDate)
	]
);

export const crmProposals = pgTable(
	'crm_proposals',
	{
		id: text('id').primaryKey(),
		opportunityId: text('opportunity_id')
			.notNull()
			.references(() => crmOpportunities.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		amount: integer('amount'),
		status: text('status', {
			enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']
		})
			.notNull()
			.default('draft'),
		sentAt: bigint('sent_at', { mode: 'number' }),
		expiresAt: bigint('expires_at', { mode: 'number' }),
		respondedAt: bigint('responded_at', { mode: 'number' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_proposals_opp').on(t.opportunityId)]
);

export const crmProducts = pgTable(
	'crm_products',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		sku: text('sku'),
		description: text('description'),
		category: text('category'),
		type: text('type', { enum: ['product', 'service', 'subscription'] }).notNull().default('service'),
		status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
		taxable: boolean('taxable').notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [uniqueIndex('idx_crm_products_sku').on(t.sku)]
);

export const crmPriceTiers = pgTable(
	'crm_price_tiers',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => crmProducts.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		billingModel: text('billing_model', {
			enum: ['one_time', 'recurring', 'per_unit', 'tiered', 'usage']
		})
			.notNull()
			.default('one_time'),
		unitAmount: integer('unit_amount'),
		currency: text('currency').notNull().default('USD'),
		billingInterval: text('billing_interval', {
			enum: ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']
		}),
		setupFee: integer('setup_fee'),
		trialDays: integer('trial_days'),
		unitLabel: text('unit_label'),
		minQuantity: integer('min_quantity'),
		maxQuantity: integer('max_quantity'),
		isDefault: boolean('is_default').notNull().default(false),
		position: integer('position').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_price_tiers_product').on(t.productId, t.position)]
);

export const crmPriceBrackets = pgTable(
	'crm_price_brackets',
	{
		id: text('id').primaryKey(),
		priceTierId: text('price_tier_id')
			.notNull()
			.references(() => crmPriceTiers.id, { onDelete: 'cascade' }),
		minUnits: integer('min_units').notNull(),
		maxUnits: integer('max_units'),
		unitAmount: integer('unit_amount').notNull(),
		flatAmount: integer('flat_amount'),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('idx_crm_price_brackets_tier').on(t.priceTierId, t.position)]
);

export const crmOpportunityItems = pgTable(
	'crm_opportunity_items',
	{
		id: text('id').primaryKey(),
		opportunityId: text('opportunity_id')
			.notNull()
			.references(() => crmOpportunities.id, { onDelete: 'cascade' }),
		productId: text('product_id')
			.notNull()
			.references(() => crmProducts.id),
		priceTierId: text('price_tier_id').references(() => crmPriceTiers.id, { onDelete: 'set null' }),
		description: text('description'),
		quantity: doublePrecision('quantity').notNull().default(1),
		unitAmount: integer('unit_amount').notNull(),
		discountPercent: integer('discount_percent'),
		discountAmount: integer('discount_amount'),
		setupFee: integer('setup_fee'),
		billingModel: text('billing_model', {
			enum: ['one_time', 'recurring', 'per_unit', 'tiered', 'usage']
		}),
		billingInterval: text('billing_interval', {
			enum: ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']
		}),
		position: integer('position').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_opp_items_opp').on(t.opportunityId, t.position),
		index('idx_crm_opp_items_product').on(t.productId)
	]
);

export const crmProposalItems = pgTable(
	'crm_proposal_items',
	{
		id: text('id').primaryKey(),
		proposalId: text('proposal_id')
			.notNull()
			.references(() => crmProposals.id, { onDelete: 'cascade' }),
		opportunityItemId: text('opportunity_item_id').references(() => crmOpportunityItems.id, {
			onDelete: 'set null'
		}),
		productName: text('product_name').notNull(),
		productSku: text('product_sku'),
		description: text('description'),
		quantity: doublePrecision('quantity').notNull(),
		unitAmount: integer('unit_amount').notNull(),
		discountPercent: integer('discount_percent'),
		discountAmount: integer('discount_amount'),
		setupFee: integer('setup_fee'),
		billingModel: text('billing_model', {
			enum: ['one_time', 'recurring', 'per_unit', 'tiered', 'usage']
		}),
		billingInterval: text('billing_interval', {
			enum: ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']
		}),
		lineTotal: integer('line_total').notNull(),
		position: integer('position').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_proposal_items_proposal').on(t.proposalId, t.position)]
);

// ─── User Themes ─────────────────────────────────────────────────────────────

export const userThemes = pgTable(
	'user_themes',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		source: text('source').notNull(),
		variables: text('variables').notNull(),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_user_themes_user').on(t.userId)]
);

// ─── Organization Settings ───────────────────────────────────────────────────

export const orgSettings = pgTable('org_settings', {
	id: text('id').primaryKey(), // always 'default'
	platformName: text('platform_name').notNull().default('PM'),
	// Telnyx telephony integration
	telnyxEnabled: boolean('telnyx_enabled').notNull().default(false),
	telnyxApiKey: text('telnyx_api_key'),
	telnyxConnectionId: text('telnyx_connection_id'),
	telnyxCredentialId: text('telnyx_credential_id'),
	telnyxCallerNumber: text('telnyx_caller_number'),
	telnyxRecordCalls: boolean('telnyx_record_calls').notNull().default(false),
	// Google Calendar OAuth
	googleClientId: text('google_client_id'),
	googleClientSecret: text('google_client_secret'),
	// Email provider
	emailProvider: text('email_provider'), // 'resend' | null
	emailFromAddress: text('email_from_address'),
	resendApiKey: text('resend_api_key'),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

// ─── Telnyx Call Logs ────────────────────────────────────────────────────────

export const telnyxCallLogs = pgTable(
	'telnyx_call_logs',
	{
		id: text('id').primaryKey(),
		telnyxCallControlId: text('telnyx_call_control_id'),
		telnyxCallSessionId: text('telnyx_call_session_id'),
		direction: text('direction', { enum: ['outbound', 'inbound'] }).notNull(),
		fromNumber: text('from_number').notNull(),
		toNumber: text('to_number').notNull(),
		status: text('status', {
			enum: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no_answer', 'cancelled']
		})
			.notNull()
			.default('initiated'),
		startedAt: bigint('started_at', { mode: 'number' }),
		answeredAt: bigint('answered_at', { mode: 'number' }),
		endedAt: bigint('ended_at', { mode: 'number' }),
		durationSeconds: integer('duration_seconds'),
		recordingUrl: text('recording_url'),
		contactId: text('contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		crmActivityId: text('crm_activity_id').references(() => crmActivities.id, { onDelete: 'set null' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		notes: text('notes'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_telnyx_calls_user').on(t.userId, t.createdAt),
		index('idx_telnyx_calls_contact').on(t.contactId),
		index('idx_telnyx_calls_company').on(t.companyId),
		index('idx_telnyx_calls_session').on(t.telnyxCallSessionId),
		index('idx_telnyx_calls_status').on(t.status)
	]
);

// ─── Financials ─────────────────────────────────────────────────────────────

export const finAccounts = pgTable(
	'fin_accounts',
	{
		id: text('id').primaryKey(),
		accountNumber: integer('account_number').notNull().unique(),
		name: text('name').notNull(),
		accountType: text('account_type', {
			enum: ['asset', 'liability', 'equity', 'revenue', 'expense']
		}).notNull(),
		subtype: text('subtype'),
		description: text('description'),
		parentId: text('parent_id'),
		normalBalance: text('normal_balance', { enum: ['debit', 'credit'] }).notNull(),
		currency: text('currency').notNull().default('USD'),
		active: boolean('active').notNull().default(true),
		isSystem: boolean('is_system').notNull().default(false),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_accounts_type_active').on(t.accountType, t.active),
		index('idx_fin_accounts_parent').on(t.parentId)
	]
);

export const finBankAccountMeta = pgTable(
	'fin_bank_account_meta',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id')
			.notNull()
			.unique()
			.references(() => finAccounts.id, { onDelete: 'cascade' }),
		institutionName: text('institution_name'),
		accountNumberLast4: text('account_number_last4'),
		routingNumber: text('routing_number'),
		accountSubtype: text('account_subtype', {
			enum: ['checking', 'savings', 'credit_card', 'money_market', 'petty_cash', 'paypal', 'other']
		}).notNull(),
		openingBalance: integer('opening_balance').notNull().default(0),
		openingBalanceDate: bigint('opening_balance_date', { mode: 'number' }),
		lastReconciledDate: bigint('last_reconciled_date', { mode: 'number' }),
		lastReconciledBalance: integer('last_reconciled_balance'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	}
);

export const finJournalEntries = pgTable(
	'fin_journal_entries',
	{
		id: text('id').primaryKey(),
		entryNumber: integer('entry_number').notNull(),
		date: bigint('date', { mode: 'number' }).notNull(),
		description: text('description').notNull(),
		memo: text('memo'),
		referenceNumber: text('reference_number'),
		status: text('status', { enum: ['draft', 'posted', 'voided'] }).notNull().default('draft'),
		source: text('source', {
			enum: ['manual', 'crm_sync', 'recurring', 'import', 'opening_balance', 'void_reversal']
		}).notNull().default('manual'),
		crmOpportunityId: text('crm_opportunity_id').references(() => crmOpportunities.id, { onDelete: 'set null' }),
		crmProposalId: text('crm_proposal_id').references(() => crmProposals.id, { onDelete: 'set null' }),
		crmCompanyId: text('crm_company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		voidedEntryId: text('voided_entry_id'),
		voidedAt: bigint('voided_at', { mode: 'number' }),
		voidReason: text('void_reason'),
		recurringRuleId: text('recurring_rule_id'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_je_date').on(t.date),
		index('idx_fin_je_status_date').on(t.status, t.date),
		index('idx_fin_je_source').on(t.source),
		index('idx_fin_je_crm_opp').on(t.crmOpportunityId),
		index('idx_fin_je_entry_number').on(t.entryNumber)
	]
);

export const finJournalLines = pgTable(
	'fin_journal_lines',
	{
		id: text('id').primaryKey(),
		journalEntryId: text('journal_entry_id')
			.notNull()
			.references(() => finJournalEntries.id, { onDelete: 'cascade' }),
		accountId: text('account_id')
			.notNull()
			.references(() => finAccounts.id),
		debit: integer('debit').notNull().default(0),
		credit: integer('credit').notNull().default(0),
		memo: text('memo'),
		position: integer('position').notNull().default(0),
		reconciled: boolean('reconciled').notNull().default(false),
		reconciledAt: bigint('reconciled_at', { mode: 'number' }),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_jl_entry_pos').on(t.journalEntryId, t.position),
		index('idx_fin_jl_account_entry').on(t.accountId, t.journalEntryId),
		index('idx_fin_jl_account_reconciled').on(t.accountId, t.reconciled)
	]
);

export const finRecurringRules = pgTable(
	'fin_recurring_rules',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		frequency: text('frequency', {
			enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
		}).notNull(),
		startDate: bigint('start_date', { mode: 'number' }).notNull(),
		endDate: bigint('end_date', { mode: 'number' }),
		nextOccurrence: bigint('next_occurrence', { mode: 'number' }).notNull(),
		autoPost: boolean('auto_post').notNull().default(false),
		status: text('status', { enum: ['active', 'paused', 'cancelled'] }).notNull().default('active'),
		templateDescription: text('template_description').notNull(),
		templateLines: text('template_lines').notNull(), // JSON: [{ accountId, debit, credit, memo }]
		lastGeneratedAt: bigint('last_generated_at', { mode: 'number' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_rr_status_next').on(t.status, t.nextOccurrence),
		index('idx_fin_rr_next').on(t.nextOccurrence)
	]
);

export const finBudgets = pgTable(
	'fin_budgets',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id')
			.notNull()
			.references(() => finAccounts.id, { onDelete: 'cascade' }),
		periodType: text('period_type', { enum: ['monthly', 'quarterly', 'yearly'] }).notNull(),
		periodStart: bigint('period_start', { mode: 'number' }).notNull(),
		periodEnd: bigint('period_end', { mode: 'number' }).notNull(),
		amount: integer('amount').notNull(),
		notes: text('notes'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_budgets_account_period').on(t.accountId, t.periodStart),
		uniqueIndex('idx_fin_budgets_unique').on(t.accountId, t.periodType, t.periodStart)
	]
);

// ─── Dial Sessions ───────────────────────────────────────────────────────────

export const dialSessions = pgTable(
	'dial_sessions',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		status: text('status', { enum: ['active', 'paused', 'completed'] }).notNull().default('active'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		totalContacts: integer('total_contacts').notNull().default(0),
		completedContacts: integer('completed_contacts').notNull().default(0),
		totalConnected: integer('total_connected').notNull().default(0),
		totalNoAnswer: integer('total_no_answer').notNull().default(0),
		totalDurationSeconds: integer('total_duration_seconds').notNull().default(0),
		startedAt: bigint('started_at', { mode: 'number' }),
		endedAt: bigint('ended_at', { mode: 'number' }),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_dial_sessions_user').on(t.userId, t.createdAt),
		index('idx_dial_sessions_status').on(t.status)
	]
);

export const dialQueueItems = pgTable(
	'dial_queue_items',
	{
		id: text('id').primaryKey(),
		sessionId: text('session_id')
			.notNull()
			.references(() => dialSessions.id, { onDelete: 'cascade' }),
		contactId: text('contact_id')
			.notNull()
			.references(() => crmContacts.id, { onDelete: 'cascade' }),
		position: doublePrecision('position').notNull(),
		status: text('status', {
			enum: ['pending', 'calling', 'completed', 'skipped']
		}).notNull().default('pending'),
		disposition: text('disposition', {
			enum: [
				'connected_interested', 'connected_not_interested',
				'connected_callback', 'connected_left_voicemail',
				'connected_wrong_number', 'connected_do_not_call',
				'no_answer', 'busy',
				'voicemail_left_message', 'voicemail_no_message'
			]
		}),
		notes: text('notes'),
		callbackAt: bigint('callback_at', { mode: 'number' }),
		callLogId: text('call_log_id')
			.references(() => telnyxCallLogs.id, { onDelete: 'set null' }),
		crmActivityId: text('crm_activity_id')
			.references(() => crmActivities.id, { onDelete: 'set null' }),
		callDurationSeconds: integer('call_duration_seconds'),
		dialedAt: bigint('dialed_at', { mode: 'number' }),
		completedAt: bigint('completed_at', { mode: 'number' }),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_dial_queue_session').on(t.sessionId, t.position),
		index('idx_dial_queue_contact').on(t.contactId),
		index('idx_dial_queue_status').on(t.sessionId, t.status)
	]
);

// ─── Financials ──────────────────────────────────────────────────────────────

export const finReconciliations = pgTable(
	'fin_reconciliations',
	{
		id: text('id').primaryKey(),
		bankAccountId: text('bank_account_id')
			.notNull()
			.references(() => finAccounts.id),
		statementDate: bigint('statement_date', { mode: 'number' }).notNull(),
		statementBalance: integer('statement_balance').notNull(),
		reconciledBalance: integer('reconciled_balance'),
		status: text('status', { enum: ['in_progress', 'completed'] }).notNull().default('in_progress'),
		completedAt: bigint('completed_at', { mode: 'number' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	}
);

// ─── Bookings ────────────────────────────────────────────────────────────────

export const bookingEventTypes = pgTable(
	'booking_event_types',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		durationMinutes: integer('duration_minutes').notNull().default(30),
		color: text('color').notNull().default('#6366f1'),
		location: text('location'),
		bufferMinutes: integer('buffer_minutes').notNull().default(0),
		minNoticeHours: integer('min_notice_hours').notNull().default(4),
		maxDaysOut: integer('max_days_out').notNull().default(60),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_booking_event_types_user').on(t.userId),
		index('idx_booking_event_types_slug').on(t.slug)
	]
);

export const bookings = pgTable(
	'bookings',
	{
		id: text('id').primaryKey(),
		eventTypeId: text('event_type_id')
			.notNull()
			.references(() => bookingEventTypes.id, { onDelete: 'cascade' }),
		inviteeName: text('invitee_name').notNull(),
		inviteeEmail: text('invitee_email').notNull(),
		startTime: bigint('start_time', { mode: 'number' }).notNull(),
		endTime: bigint('end_time', { mode: 'number' }).notNull(),
		timezone: text('timezone').notNull().default('America/New_York'),
		status: text('status', { enum: ['confirmed', 'cancelled'] }).notNull().default('confirmed'),
		notes: text('notes'),
		googleEventId: text('google_event_id'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_bookings_event_type').on(t.eventTypeId),
		index('idx_bookings_start_time').on(t.startTime),
		index('idx_bookings_status').on(t.status)
	]
);

export const calendarIntegrations = pgTable('calendar_integrations', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider', { enum: ['google'] }).notNull().default('google'),
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token').notNull(),
	tokenExpiry: bigint('token_expiry', { mode: 'number' }).notNull(),
	calendarId: text('calendar_id').notNull().default('primary'),
	createdAt: bigint('created_at', { mode: 'number' }).notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

// ─── Gmail Integration ───────────────────────────────────────────────────────

export const gmailIntegrations = pgTable('gmail_integrations', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token').notNull(),
	tokenExpiry: bigint('token_expiry', { mode: 'number' }).notNull(),
	historyId: text('history_id'),
	lastSyncAt: bigint('last_sync_at', { mode: 'number' }),
	createdAt: bigint('created_at', { mode: 'number' }).notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const gmailThreads = pgTable(
	'gmail_threads',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		subject: text('subject').notNull(),
		snippet: text('snippet'),
		lastMessageAt: bigint('last_message_at', { mode: 'number' }).notNull(),
		messageCount: integer('message_count').notNull().default(1),
		isRead: boolean('is_read').notNull().default(false),
		isStarred: boolean('is_starred').notNull().default(false),
		labels: text('labels'),
		category: text('category', {
			enum: ['inbox', 'sent', 'draft', 'archived', 'trash']
		}).notNull().default('inbox'),
		syncedAt: bigint('synced_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_gmail_threads_user').on(t.userId, t.lastMessageAt),
		index('idx_gmail_threads_category').on(t.userId, t.category)
	]
);

export const gmailMessages = pgTable(
	'gmail_messages',
	{
		id: text('id').primaryKey(),
		threadId: text('thread_id')
			.notNull()
			.references(() => gmailThreads.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		fromEmail: text('from_email').notNull(),
		fromName: text('from_name'),
		toEmails: text('to_emails').notNull(),
		ccEmails: text('cc_emails'),
		bccEmails: text('bcc_emails'),
		subject: text('subject').notNull(),
		bodyHtml: text('body_html'),
		bodyText: text('body_text'),
		snippet: text('snippet'),
		internalDate: bigint('internal_date', { mode: 'number' }).notNull(),
		labelIds: text('label_ids'),
		isRead: boolean('is_read').notNull().default(false),
		hasAttachments: boolean('has_attachments').notNull().default(false),
		syncedAt: bigint('synced_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_gmail_msgs_thread').on(t.threadId),
		index('idx_gmail_msgs_user_date').on(t.userId, t.internalDate),
		index('idx_gmail_msgs_from').on(t.fromEmail)
	]
);

export const gmailAttachments = pgTable(
	'gmail_attachments',
	{
		id: text('id').primaryKey(),
		messageId: text('message_id')
			.notNull()
			.references(() => gmailMessages.id, { onDelete: 'cascade' }),
		gmailAttachmentId: text('gmail_attachment_id').notNull(),
		filename: text('filename').notNull(),
		mimeType: text('mime_type').notNull(),
		size: integer('size').notNull()
	},
	(t) => [index('idx_gmail_attachments_msg').on(t.messageId)]
);

export const gmailEntityLinks = pgTable(
	'gmail_entity_links',
	{
		id: text('id').primaryKey(),
		threadId: text('thread_id')
			.notNull()
			.references(() => gmailThreads.id, { onDelete: 'cascade' }),
		contactId: text('contact_id').references(() => crmContacts.id, { onDelete: 'cascade' }),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'cascade' }),
		opportunityId: text('opportunity_id').references(() => crmOpportunities.id, { onDelete: 'cascade' }),
		linkType: text('link_type', { enum: ['auto', 'manual'] }).notNull().default('auto'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_gmail_links_thread').on(t.threadId),
		index('idx_gmail_links_contact').on(t.contactId),
		index('idx_gmail_links_company').on(t.companyId),
		index('idx_gmail_links_opp').on(t.opportunityId)
	]
);

// ─── CRM Custom Fields ──────────────────────────────────────────────────────

export const crmCustomFieldDefs = pgTable(
	'crm_custom_field_defs',
	{
		id: text('id').primaryKey(),
		entityType: text('entity_type', { enum: ['company', 'contact', 'opportunity', 'lead'] }).notNull(),
		fieldName: text('field_name').notNull(),
		label: text('label').notNull(),
		fieldType: text('field_type', {
			enum: ['text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url', 'email', 'currency']
		}).notNull(),
		options: text('options'), // JSON array for select/multi_select
		required: boolean('required').notNull().default(false),
		position: integer('position').notNull().default(0),
		showInList: boolean('show_in_list').notNull().default(false),
		showInCard: boolean('show_in_card').notNull().default(false),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_cfd_entity').on(t.entityType, t.position),
		uniqueIndex('idx_crm_cfd_unique_name').on(t.entityType, t.fieldName)
	]
);

export const crmCustomFieldValues = pgTable(
	'crm_custom_field_values',
	{
		id: text('id').primaryKey(),
		fieldDefId: text('field_def_id')
			.notNull()
			.references(() => crmCustomFieldDefs.id, { onDelete: 'cascade' }),
		entityId: text('entity_id').notNull(),
		value: text('value'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		uniqueIndex('idx_crm_cfv_field_entity').on(t.fieldDefId, t.entityId),
		index('idx_crm_cfv_entity').on(t.entityId)
	]
);

// ─── CRM Automations ────────────────────────────────────────────────────────

export const crmAutomationRules = pgTable(
	'crm_automation_rules',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		entityType: text('entity_type', {
			enum: ['opportunity', 'contact', 'company', 'activity', 'lead']
		}).notNull(),
		trigger: text('trigger').notNull(), // JSON: { event, config? }
		conditions: text('conditions'), // JSON: [{ field, operator, value }]
		actions: text('actions').notNull(), // JSON: [{ type, ...config }]
		enabled: boolean('enabled').notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_auto_rules_entity').on(t.entityType, t.enabled)]
);

export const crmAutomationExecutions = pgTable(
	'crm_automation_executions',
	{
		id: text('id').primaryKey(),
		ruleId: text('rule_id')
			.notNull()
			.references(() => crmAutomationRules.id, { onDelete: 'cascade' }),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id').notNull(),
		triggerEvent: text('trigger_event').notNull(),
		status: text('status', { enum: ['success', 'error', 'skipped'] }).notNull(),
		actionsRun: text('actions_run'), // JSON
		error: text('error'),
		durationMs: integer('duration_ms'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_auto_exec_rule').on(t.ruleId, t.createdAt),
		index('idx_crm_auto_exec_entity').on(t.entityType, t.entityId)
	]
);
