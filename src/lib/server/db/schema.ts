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

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	color: text('color').notNull().default('#6366f1'),
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
		position: real('position').notNull(),
		createdAt: integer('created_at', { mode: 'number' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'number' }).notNull()
	},
	(table) => [
		index('idx_tasks_board').on(table.projectId, table.statusId, table.position),
		uniqueIndex('idx_tasks_number').on(table.projectId, table.number),
		index('idx_tasks_assignee').on(table.assigneeId)
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
				'edited'
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
	onComment: integer('on_comment', { mode: 'boolean' }).notNull().default(true)
});
