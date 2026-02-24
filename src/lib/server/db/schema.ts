import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
	activeThemeId: text('active_theme_id'),
	createdAt: integer('created_at', { mode: 'number' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
	createdAt: integer('created_at', { mode: 'number' }).notNull()
});

export const inviteTokens = sqliteTable('invite_tokens', {
	id: text('id').primaryKey(),
	token: text('token').notNull().unique(),
	email: text('email'),
	role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	usedBy: text('used_by').references(() => users.id),
	expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
	usedAt: integer('used_at', { mode: 'number' }),
	createdAt: integer('created_at', { mode: 'number' }).notNull()
});

// ─── Folders ──────────────────────────────────────────────────────────────────

export const folders = sqliteTable('folders', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	parentId: text('parent_id'),
	color: text('color'),
	position: integer('position').notNull().default(0),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: integer('created_at', { mode: 'number' }).notNull()
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	color: text('color').notNull().default('#2d4f3e'),
	folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
	archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
	readme: text('readme'),
	defaultAssigneeId: text('default_assignee_id').references(() => users.id, { onDelete: 'set null' }),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: integer('created_at', { mode: 'number' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const taskStatuses = sqliteTable(
	'task_statuses',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color').notNull(),
		position: integer('position').notNull(),
		isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_statuses_project').on(table.projectId, table.position)]
);

// ─── Sprints ──────────────────────────────────────────────────────────────────

export const sprints = sqliteTable(
	'sprints',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		goal: text('goal'),
		startDate: integer('start_date', { mode: 'number' }),
		endDate: integer('end_date', { mode: 'number' }),
		status: text('status', { enum: ['planning', 'active', 'completed', 'cancelled'] })
			.notNull()
			.default('planning'),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_sprints_project').on(table.projectId, table.status)]
);

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = sqliteTable(
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
		dueDate: integer('due_date', { mode: 'number' }),
		startDate: integer('start_date', { mode: 'number' }),
		sprintId: text('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
		estimatePoints: integer('estimate_points'),
		recurrence: text('recurrence'), // JSON: { freq, interval, endDate? }
		recurrenceSourceId: text('recurrence_source_id'),
		position: real('position').notNull(),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_tasks_board').on(table.projectId, table.statusId, table.position),
		uniqueIndex('idx_tasks_number').on(table.projectId, table.number),
		index('idx_tasks_assignee').on(table.assigneeId),
		index('idx_tasks_sprint').on(table.sprintId),
		index('idx_tasks_parent').on(table.parentId)
	]
);

export const taskLabels = sqliteTable('task_labels', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	color: text('color').notNull(),
	createdAt: integer('created_at', { mode: 'number' }).notNull()
});

export const taskLabelAssignments = sqliteTable(
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

export const checklistItems = sqliteTable(
	'checklist_items',
	{
		id: text('id').primaryKey(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_checklist_task').on(table.taskId, table.position)]
);

// ─── Task Dependencies ───────────────────────────────────────────────────────

export const taskDependencies = sqliteTable(
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

export const attachments = sqliteTable(
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
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_attachments_task').on(table.taskId)]
);

// ─── Collaboration ────────────────────────────────────────────────────────────

export const comments = sqliteTable(
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
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_comments_task').on(table.taskId, table.createdAt)]
);

export const commentReactions = sqliteTable(
	'comment_reactions',
	{
		commentId: text('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		emoji: text('emoji').notNull(),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		primaryKey({ columns: [table.commentId, table.userId, table.emoji] }),
		index('idx_reactions_comment').on(table.commentId)
	]
);

export const activityLog = sqliteTable(
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
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_activity_task').on(table.taskId, table.createdAt)]
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const pushSubscriptions = sqliteTable('push_subscriptions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	keysP256dh: text('keys_p256dh').notNull(),
	keysAuth: text('keys_auth').notNull(),
	createdAt: integer('created_at', { mode: 'number' }).notNull()
});

export const notificationPreferences = sqliteTable('notification_preferences', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
		.unique(),
	onAssigned: integer('on_assigned', { mode: 'boolean' }).notNull().default(true),
	onStatusChange: integer('on_status_change', { mode: 'boolean' }).notNull().default(true),
	onComment: integer('on_comment', { mode: 'boolean' }).notNull().default(true),
	onMention: integer('on_mention', { mode: 'boolean' }).notNull().default(true),
	emailEnabled: integer('email_enabled', { mode: 'boolean' }).notNull().default(true),
	reminderDueSoon: integer('reminder_due_soon', { mode: 'boolean' }).notNull().default(true),
	reminderDueToday: integer('reminder_due_today', { mode: 'boolean' }).notNull().default(true),
	reminderOverdue: integer('reminder_overdue', { mode: 'boolean' }).notNull().default(true),
	dueDateEmailMode: text('due_date_email_mode', { enum: ['off', 'each', 'daily', 'weekly'] }).notNull().default('off'),
	digestDay: integer('digest_day').notNull().default(1),
	digestHour: integer('digest_hour').notNull().default(8),
	lastDigestSentAt: integer('last_digest_sent_at', { mode: 'number' }).notNull().default(0)
});

// ─── In-App Notifications ────────────────────────────────────────────────────

export const notifications = sqliteTable(
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
		read: integer('read', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_notifications_user').on(table.userId, table.read, table.createdAt)
	]
);

// ─── Time Tracking ───────────────────────────────────────────────────────────

export const timeEntries = sqliteTable(
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
		startedAt: integer('started_at', { mode: 'number' }).notNull(),
		stoppedAt: integer('stopped_at', { mode: 'number' }),
		durationMs: integer('duration_ms'),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_time_entries_task').on(table.taskId)]
);

// ─── Task Templates ──────────────────────────────────────────────────────────

export const taskTemplates = sqliteTable('task_templates', {
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
	createdAt: integer('created_at', { mode: 'number' }).notNull()
});

// ─── Saved Views ─────────────────────────────────────────────────────────────

export const savedViews = sqliteTable(
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
		shared: integer('shared', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_views_project_user').on(table.projectId, table.userId)]
);

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const webhooks = sqliteTable(
	'webhooks',
	{
		id: text('id').primaryKey(),
		url: text('url').notNull(),
		secret: text('secret'),
		events: text('events').notNull(), // JSON array: ["task.created", "task.updated", ...]
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	}
);

// ─── Task Watchers ──────────────────────────────────────────────────────────

export const taskWatchers = sqliteTable(
	'task_watchers',
	{
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		primaryKey({ columns: [table.taskId, table.userId] })
	]
);

// ─── Sprint Snapshots ────────────────────────────────────────────────────────

export const sprintSnapshots = sqliteTable(
	'sprint_snapshots',
	{
		id: text('id').primaryKey(),
		sprintId: text('sprint_id')
			.notNull()
			.references(() => sprints.id, { onDelete: 'cascade' }),
		date: integer('date', { mode: 'number' }).notNull(),
		totalTasks: integer('total_tasks').notNull(),
		completedTasks: integer('completed_tasks').notNull(),
		totalPoints: integer('total_points').notNull().default(0),
		completedPoints: integer('completed_points').notNull().default(0),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_snapshots_sprint').on(table.sprintId, table.date)]
);

// ─── Automation Rules ────────────────────────────────────────────────────────

export const automationRules = sqliteTable(
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
		enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [index('idx_automation_rules_project').on(table.projectId, table.enabled)]
);

export const automationExecutions = sqliteTable(
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
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_automation_exec_rule').on(table.ruleId, table.createdAt),
		index('idx_automation_exec_task').on(table.taskId)
	]
);

// ─── Due Date Reminder Tracking ──────────────────────────────────────────────

export const dueDateRemindersSent = sqliteTable(
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
		sentAt: integer('sent_at', { mode: 'number' }).notNull()
	},
	(table) => [
		uniqueIndex('idx_reminders_unique').on(table.userId, table.taskId, table.tier),
		index('idx_reminders_task').on(table.taskId)
	]
);

// ─── CRM ─────────────────────────────────────────────────────────────────────

export const crmCompanies = sqliteTable(
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
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_companies_owner').on(t.ownerId)]
);

export const crmContacts = sqliteTable(
	'crm_contacts',
	{
		id: text('id').primaryKey(),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		email: text('email'),
		phone: text('phone'),
		title: text('title'),
		isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
		source: text('source', {
			enum: ['referral', 'inbound', 'outbound', 'website', 'event', 'other']
		}),
		notes: text('notes'),
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_contacts_company').on(t.companyId),
		index('idx_crm_contacts_owner').on(t.ownerId),
		index('idx_crm_contacts_email').on(t.email)
	]
);

export const crmPipelineStages = sqliteTable(
	'crm_pipeline_stages',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		color: text('color').notNull(),
		position: integer('position').notNull(),
		isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
		isWon: integer('is_won', { mode: 'boolean' }).notNull().default(false),
		probability: integer('probability').notNull().default(0),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_stages_position').on(t.position)]
);

export const crmOpportunities = sqliteTable(
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
		expectedCloseDate: integer('expected_close_date', { mode: 'number' }),
		actualCloseDate: integer('actual_close_date', { mode: 'number' }),
		priority: text('priority', { enum: ['hot', 'warm', 'cold'] }).notNull().default('warm'),
		source: text('source', {
			enum: ['referral', 'inbound', 'outbound', 'website', 'event', 'partner', 'other']
		}),
		description: text('description'),
		lostReason: text('lost_reason'),
		position: real('position').notNull(),
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_opps_company').on(t.companyId),
		index('idx_crm_opps_stage').on(t.stageId, t.position),
		index('idx_crm_opps_owner').on(t.ownerId),
		index('idx_crm_opps_close').on(t.expectedCloseDate)
	]
);

export const crmOpportunityContacts = sqliteTable(
	'crm_opportunity_contacts',
	{
		opportunityId: text('opportunity_id')
			.notNull()
			.references(() => crmOpportunities.id, { onDelete: 'cascade' }),
		contactId: text('contact_id')
			.notNull()
			.references(() => crmContacts.id, { onDelete: 'cascade' }),
		role: text('role')
	},
	(t) => [primaryKey({ columns: [t.opportunityId, t.contactId] })]
);

export const crmActivities = sqliteTable(
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
		scheduledAt: integer('scheduled_at', { mode: 'number' }),
		completedAt: integer('completed_at', { mode: 'number' }),
		durationMinutes: integer('duration_minutes'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_act_company').on(t.companyId),
		index('idx_crm_act_contact').on(t.contactId),
		index('idx_crm_act_opp').on(t.opportunityId),
		index('idx_crm_act_user_date').on(t.userId, t.createdAt)
	]
);

export const crmTasks = sqliteTable(
	'crm_tasks',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		description: text('description'),
		dueDate: integer('due_date', { mode: 'number' }),
		completedAt: integer('completed_at', { mode: 'number' }),
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
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_tasks_assignee').on(t.assigneeId, t.completedAt),
		index('idx_crm_tasks_due').on(t.dueDate)
	]
);

export const crmProposals = sqliteTable(
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
		sentAt: integer('sent_at', { mode: 'number' }),
		expiresAt: integer('expires_at', { mode: 'number' }),
		respondedAt: integer('responded_at', { mode: 'number' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_proposals_opp').on(t.opportunityId)]
);

export const crmProducts = sqliteTable(
	'crm_products',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		sku: text('sku'),
		description: text('description'),
		category: text('category'),
		type: text('type', { enum: ['product', 'service', 'subscription'] }).notNull().default('service'),
		status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
		taxable: integer('taxable', { mode: 'boolean' }).notNull().default(true),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [uniqueIndex('idx_crm_products_sku').on(t.sku)]
);

export const crmPriceTiers = sqliteTable(
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
		isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_price_tiers_product').on(t.productId, t.position)]
);

export const crmPriceBrackets = sqliteTable(
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

export const crmOpportunityItems = sqliteTable(
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
		quantity: real('quantity').notNull().default(1),
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
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_crm_opp_items_opp').on(t.opportunityId, t.position),
		index('idx_crm_opp_items_product').on(t.productId)
	]
);

export const crmProposalItems = sqliteTable(
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
		quantity: real('quantity').notNull(),
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
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_crm_proposal_items_proposal').on(t.proposalId, t.position)]
);

// ─── User Themes ─────────────────────────────────────────────────────────────

export const userThemes = sqliteTable(
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
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [index('idx_user_themes_user').on(t.userId)]
);

// ─── Organization Settings ───────────────────────────────────────────────────

export const orgSettings = sqliteTable('org_settings', {
	id: text('id').primaryKey(), // always 'default'
	platformName: text('platform_name').notNull().default('PM'),
	// Telnyx telephony integration
	telnyxEnabled: integer('telnyx_enabled', { mode: 'boolean' }).notNull().default(false),
	telnyxApiKey: text('telnyx_api_key'),
	telnyxConnectionId: text('telnyx_connection_id'),
	telnyxCredentialId: text('telnyx_credential_id'),
	telnyxCallerNumber: text('telnyx_caller_number'),
	telnyxRecordCalls: integer('telnyx_record_calls', { mode: 'boolean' }).notNull().default(false),
	updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

// ─── Telnyx Call Logs ────────────────────────────────────────────────────────

export const telnyxCallLogs = sqliteTable(
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
		startedAt: integer('started_at', { mode: 'number' }),
		answeredAt: integer('answered_at', { mode: 'number' }),
		endedAt: integer('ended_at', { mode: 'number' }),
		durationSeconds: integer('duration_seconds'),
		recordingUrl: text('recording_url'),
		contactId: text('contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
		companyId: text('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
		crmActivityId: text('crm_activity_id').references(() => crmActivities.id, { onDelete: 'set null' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
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

export const finAccounts = sqliteTable(
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
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_accounts_type_active').on(t.accountType, t.active),
		index('idx_fin_accounts_parent').on(t.parentId)
	]
);

export const finBankAccountMeta = sqliteTable(
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
		openingBalanceDate: integer('opening_balance_date', { mode: 'number' }),
		lastReconciledDate: integer('last_reconciled_date', { mode: 'number' }),
		lastReconciledBalance: integer('last_reconciled_balance'),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	}
);

export const finJournalEntries = sqliteTable(
	'fin_journal_entries',
	{
		id: text('id').primaryKey(),
		entryNumber: integer('entry_number').notNull(),
		date: integer('date', { mode: 'number' }).notNull(),
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
		voidedAt: integer('voided_at', { mode: 'number' }),
		voidReason: text('void_reason'),
		recurringRuleId: text('recurring_rule_id'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_je_date').on(t.date),
		index('idx_fin_je_status_date').on(t.status, t.date),
		index('idx_fin_je_source').on(t.source),
		index('idx_fin_je_crm_opp').on(t.crmOpportunityId),
		index('idx_fin_je_entry_number').on(t.entryNumber)
	]
);

export const finJournalLines = sqliteTable(
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
		reconciled: integer('reconciled', { mode: 'boolean' }).notNull().default(false),
		reconciledAt: integer('reconciled_at', { mode: 'number' }),
		createdAt: integer('created_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_jl_entry_pos').on(t.journalEntryId, t.position),
		index('idx_fin_jl_account_entry').on(t.accountId, t.journalEntryId),
		index('idx_fin_jl_account_reconciled').on(t.accountId, t.reconciled)
	]
);

export const finRecurringRules = sqliteTable(
	'fin_recurring_rules',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		frequency: text('frequency', {
			enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
		}).notNull(),
		startDate: integer('start_date', { mode: 'number' }).notNull(),
		endDate: integer('end_date', { mode: 'number' }),
		nextOccurrence: integer('next_occurrence', { mode: 'number' }).notNull(),
		autoPost: integer('auto_post', { mode: 'boolean' }).notNull().default(false),
		status: text('status', { enum: ['active', 'paused', 'cancelled'] }).notNull().default('active'),
		templateDescription: text('template_description').notNull(),
		templateLines: text('template_lines').notNull(), // JSON: [{ accountId, debit, credit, memo }]
		lastGeneratedAt: integer('last_generated_at', { mode: 'number' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_rr_status_next').on(t.status, t.nextOccurrence),
		index('idx_fin_rr_next').on(t.nextOccurrence)
	]
);

export const finBudgets = sqliteTable(
	'fin_budgets',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id')
			.notNull()
			.references(() => finAccounts.id, { onDelete: 'cascade' }),
		periodType: text('period_type', { enum: ['monthly', 'quarterly', 'yearly'] }).notNull(),
		periodStart: integer('period_start', { mode: 'number' }).notNull(),
		periodEnd: integer('period_end', { mode: 'number' }).notNull(),
		amount: integer('amount').notNull(),
		notes: text('notes'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(t) => [
		index('idx_fin_budgets_account_period').on(t.accountId, t.periodStart),
		uniqueIndex('idx_fin_budgets_unique').on(t.accountId, t.periodType, t.periodStart)
	]
);

export const finReconciliations = sqliteTable(
	'fin_reconciliations',
	{
		id: text('id').primaryKey(),
		bankAccountId: text('bank_account_id')
			.notNull()
			.references(() => finAccounts.id),
		statementDate: integer('statement_date', { mode: 'number' }).notNull(),
		statementBalance: integer('statement_balance').notNull(),
		reconciledBalance: integer('reconciled_balance'),
		status: text('status', { enum: ['in_progress', 'completed'] }).notNull().default('in_progress'),
		completedAt: integer('completed_at', { mode: 'number' }),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	}
);
