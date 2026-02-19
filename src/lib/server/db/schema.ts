import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
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
		priority: text('priority', { enum: ['urgent', 'high', 'medium', 'low'] })
			.notNull()
			.default('medium'),
		assigneeId: text('assignee_id').references(() => users.id),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id),
		dueDate: integer('due_date', { mode: 'number' }),
		startDate: integer('start_date', { mode: 'number' }),
		sprintId: text('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
		estimatePoints: integer('estimate_points'),
		position: real('position').notNull(),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_tasks_board').on(table.projectId, table.statusId, table.position),
		uniqueIndex('idx_tasks_number').on(table.projectId, table.number),
		index('idx_tasks_assignee').on(table.assigneeId),
		index('idx_tasks_sprint').on(table.sprintId)
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
	emailEnabled: integer('email_enabled', { mode: 'boolean' }).notNull().default(true)
});

// ─── In-App Notifications ────────────────────────────────────────────────────

export const notifications = sqliteTable(
	'notifications',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['mention', 'assigned', 'status_change', 'comment', 'due_soon', 'overdue'] }).notNull(),
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
		filters: text('filters').notNull(), // JSON string: { status, priority, assignee, search, sort, dir }
		createdAt: integer('created_at', { mode: 'number' }).notNull()
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
