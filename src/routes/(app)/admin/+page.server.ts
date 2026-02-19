import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listInvites } from '$lib/server/auth/invite.js';
import { db } from '$lib/server/db/index.js';
import { users, activityLog, tasks, projects } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user?.role !== 'admin') {
		throw redirect(302, '/projects');
	}

	const allUsers = db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(users.createdAt)
		.all();

	// Audit log - load recent activity with filters
	const auditLimit = 50;
	const auditOffset = parseInt(url.searchParams.get('auditOffset') ?? '0') || 0;
	const filterUser = url.searchParams.get('auditUser') ?? '';
	const filterProject = url.searchParams.get('auditProject') ?? '';
	const filterAction = url.searchParams.get('auditAction') ?? '';

	const conditions: SQL[] = [];
	if (filterUser) conditions.push(eq(activityLog.userId, filterUser));
	if (filterAction) conditions.push(eq(activityLog.action, filterAction as any));
	if (filterProject) conditions.push(eq(projects.id, filterProject));

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const auditData = db
		.select({
			id: activityLog.id,
			action: activityLog.action,
			detail: activityLog.detail,
			createdAt: activityLog.createdAt,
			taskId: activityLog.taskId,
			taskTitle: tasks.title,
			taskNumber: tasks.number,
			projectSlug: projects.slug,
			projectName: projects.name,
			projectId: projects.id,
			userName: users.name,
			userId: users.id
		})
		.from(activityLog)
		.innerJoin(tasks, eq(activityLog.taskId, tasks.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.innerJoin(users, eq(activityLog.userId, users.id))
		.where(whereClause)
		.orderBy(desc(activityLog.createdAt))
		.limit(auditLimit)
		.offset(auditOffset)
		.all();

	const allProjects = db
		.select({ id: projects.id, name: projects.name })
		.from(projects)
		.all();

	return {
		invites: listInvites(),
		users: allUsers,
		auditLog: auditData,
		auditOffset,
		auditLimit,
		allProjects,
		auditFilters: { user: filterUser, project: filterProject, action: filterAction }
	};
};
