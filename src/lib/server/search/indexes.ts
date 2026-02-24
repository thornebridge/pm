/** Index configuration for all searchable entities. */

export interface IndexConfig {
	uid: string;
	primaryKey: string;
	searchableAttributes: string[];
	filterableAttributes: string[];
	sortableAttributes: string[];
}

export const INDEXES: Record<string, IndexConfig> = {
	contacts: {
		uid: 'contacts',
		primaryKey: 'id',
		searchableAttributes: ['firstName', 'lastName', 'email', 'phone', 'title', 'notes'],
		filterableAttributes: ['companyId', 'ownerId', 'source'],
		sortableAttributes: ['updatedAt']
	},
	companies: {
		uid: 'companies',
		primaryKey: 'id',
		searchableAttributes: ['name', 'website', 'industry', 'phone', 'address', 'city', 'state', 'notes'],
		filterableAttributes: ['ownerId', 'industry', 'size'],
		sortableAttributes: ['updatedAt']
	},
	opportunities: {
		uid: 'opportunities',
		primaryKey: 'id',
		searchableAttributes: ['title', 'description', 'nextStep'],
		filterableAttributes: ['companyId', 'stageId', 'ownerId', 'priority', 'source'],
		sortableAttributes: ['value', 'updatedAt', 'expectedCloseDate']
	},
	email_threads: {
		uid: 'email_threads',
		primaryKey: 'id',
		searchableAttributes: ['subject', 'snippet', 'fromName', 'fromEmail'],
		filterableAttributes: ['userId', 'category', 'isRead', 'isStarred'],
		sortableAttributes: ['lastMessageAt']
	},
	tasks: {
		uid: 'tasks',
		primaryKey: 'id',
		searchableAttributes: ['title'],
		filterableAttributes: ['projectId', 'assigneeId', 'statusId', 'priority'],
		sortableAttributes: ['updatedAt', 'dueDate']
	},
	projects: {
		uid: 'projects',
		primaryKey: 'id',
		searchableAttributes: ['name', 'description'],
		filterableAttributes: ['archived'],
		sortableAttributes: ['updatedAt']
	},
	comments: {
		uid: 'comments',
		primaryKey: 'id',
		searchableAttributes: ['body'],
		filterableAttributes: ['taskId', 'projectId'],
		sortableAttributes: ['createdAt']
	}
};
