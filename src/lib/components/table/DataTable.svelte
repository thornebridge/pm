<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { invalidateAll } from '$app/navigation';
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';

	interface Status {
		id: string;
		name: string;
		color: string;
		position: number;
		isClosed?: boolean;
	}

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		assigneeId: string | null;
		dueDate: number | null;
		estimatePoints: number | null;
		createdAt: number;
	}

	interface Member {
		id: string;
		name: string;
		email: string;
	}

	interface Props {
		tasks: Task[];
		statuses: Status[];
		projectSlug: string;
		projectId: string;
		members: Member[];
	}

	let { tasks, statuses, projectSlug, projectId, members }: Props = $props();

	let sortColumn = $state<'number' | 'priority' | 'title' | 'status' | 'assignee' | 'dueDate' | 'points'>('number');
	let sortAsc = $state(true);
	let groupByStatus = $state(false);
	let editingCell = $state<{ taskId: string; field: string } | null>(null);
	let editValue = $state('');

	const statusMap = $derived(new Map(statuses.map((s) => [s.id, s])));
	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

	function compareTasks(a: Task, b: Task): number {
		let result = 0;
		switch (sortColumn) {
			case 'number':
				result = a.number - b.number;
				break;
			case 'priority':
				result = priorityOrder[a.priority] - priorityOrder[b.priority];
				break;
			case 'title':
				result = a.title.localeCompare(b.title);
				break;
			case 'status': {
				const aPos = statusMap.get(a.statusId)?.position ?? 0;
				const bPos = statusMap.get(b.statusId)?.position ?? 0;
				result = aPos - bPos;
				break;
			}
			case 'assignee': {
				const aName = memberMap.get(a.assigneeId ?? '')?.name ?? '';
				const bName = memberMap.get(b.assigneeId ?? '')?.name ?? '';
				result = aName.localeCompare(bName);
				break;
			}
			case 'dueDate':
				result = (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity);
				break;
			case 'points':
				result = (a.estimatePoints ?? 0) - (b.estimatePoints ?? 0);
				break;
		}
		return sortAsc ? result : -result;
	}

	const sortedTasks = $derived([...tasks].sort(compareTasks));

	const groupedTasks = $derived.by(() => {
		if (!groupByStatus) return null;
		const groups = new Map<string, Task[]>();
		for (const status of statuses.sort((a, b) => a.position - b.position)) {
			groups.set(status.id, []);
		}
		for (const task of sortedTasks) {
			const arr = groups.get(task.statusId) || [];
			arr.push(task);
			groups.set(task.statusId, arr);
		}
		return groups;
	});

	function toggleSort(column: typeof sortColumn) {
		if (sortColumn === column) {
			sortAsc = !sortAsc;
		} else {
			sortColumn = column;
			sortAsc = true;
		}
	}

	function sortIndicator(column: typeof sortColumn) {
		if (sortColumn !== column) return '';
		return sortAsc ? ' \u2191' : ' \u2193';
	}

	function startEditTitle(task: Task) {
		editingCell = { taskId: task.id, field: 'title' };
		editValue = task.title;
	}

	async function commitEdit(task: Task, field: string, value: unknown) {
		editingCell = null;
		try {
			await api(`/api/projects/${projectId}/tasks/${task.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ [field]: value })
			});
			await invalidateAll();
		} catch {
			showToast(`Failed to update ${field}`, 'error');
		}
	}

	async function handleTitleKeydown(e: KeyboardEvent, task: Task) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (editValue.trim() && editValue.trim() !== task.title) {
				await commitEdit(task, 'title', editValue.trim());
			} else {
				editingCell = null;
			}
		} else if (e.key === 'Escape') {
			editingCell = null;
		}
	}

	function handleTitleBlur(task: Task) {
		if (editingCell?.taskId === task.id && editingCell?.field === 'title') {
			if (editValue.trim() && editValue.trim() !== task.title) {
				commitEdit(task, 'title', editValue.trim());
			} else {
				editingCell = null;
			}
		}
	}

	async function handleStatusChange(task: Task, newStatusId: string) {
		if (newStatusId !== task.statusId) {
			await commitEdit(task, 'statusId', newStatusId);
		}
	}

	async function handleAssigneeChange(task: Task, newAssigneeId: string) {
		const val = newAssigneeId || null;
		if (val !== task.assigneeId) {
			await commitEdit(task, 'assigneeId', val);
		}
	}

	function formatDate(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="px-6 pb-4">
	<!-- Toolbar -->
	<div class="mb-3 flex items-center gap-3">
		<label class="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
			<input
				type="checkbox"
				bind:checked={groupByStatus}
				class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
			/>
			Group by status
		</label>
	</div>

	<!-- Table -->
	<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-surface-300 bg-surface-100 text-left text-xs font-medium uppercase tracking-wide text-surface-500 dark:border-surface-800 dark:bg-surface-800">
					<th class="w-14 cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('number')}>
						#{sortIndicator('number')}
					</th>
					<th class="w-14 cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('priority')}>
						Pri{sortIndicator('priority')}
					</th>
					<th class="min-w-[200px] cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('title')}>
						Title{sortIndicator('title')}
					</th>
					<th class="w-32 cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('status')}>
						Status{sortIndicator('status')}
					</th>
					<th class="w-36 cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('assignee')}>
						Assignee{sortIndicator('assignee')}
					</th>
					<th class="w-28 cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('dueDate')}>
						Due{sortIndicator('dueDate')}
					</th>
					<th class="w-16 cursor-pointer px-3 py-2 select-none" onclick={() => toggleSort('points')}>
						Pts{sortIndicator('points')}
					</th>
				</tr>
			</thead>
			<tbody>
				{#if groupedTasks}
					{#each [...groupedTasks.entries()] as [statusId, groupTasks] (statusId)}
						{@const status = statusMap.get(statusId)}
						{#if status}
							<tr>
								<td colspan="7" class="border-b border-surface-200 bg-surface-100/70 px-3 py-1.5 dark:border-surface-800/50 dark:bg-surface-800/40">
									<span class="flex items-center gap-2 text-xs font-semibold text-surface-700 dark:text-surface-300">
										<span class="h-2.5 w-2.5 rounded-full" style="background-color: {status.color}"></span>
										{status.name}
										<span class="font-normal text-surface-500">({groupTasks.length})</span>
									</span>
								</td>
							</tr>
							{#each groupTasks as task (task.id)}
								{@render taskRow(task)}
							{:else}
								<tr>
									<td colspan="7" class="border-b border-surface-200 px-3 py-2 text-center text-xs text-surface-400 dark:border-surface-800/50">
										No tasks
									</td>
								</tr>
							{/each}
						{/if}
					{/each}
				{:else}
					{#each sortedTasks as task (task.id)}
						{@render taskRow(task)}
					{:else}
						<tr>
							<td colspan="7" class="px-3 py-8 text-center text-sm text-surface-500">No tasks found</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

{#snippet taskRow(task: Task)}
	{@const status = statusMap.get(task.statusId)}
	{@const assignee = memberMap.get(task.assigneeId ?? '')}
	<tr class="border-b border-surface-200 transition hover:bg-surface-100 dark:border-surface-800/50 dark:hover:bg-surface-800/30">
		<td class="px-3 py-2">
			<a
				href="/projects/{projectSlug}/task/{task.number}"
				class="text-xs text-surface-500 hover:text-brand-600"
			>
				{task.number}
			</a>
		</td>
		<td class="px-3 py-2">
			<PriorityIcon priority={task.priority} />
		</td>
		<td class="px-3 py-2">
			{#if editingCell?.taskId === task.id && editingCell?.field === 'title'}
				<input
					bind:value={editValue}
					onkeydown={(e) => handleTitleKeydown(e, task)}
					onblur={() => handleTitleBlur(task)}
					class="w-full rounded border border-brand-500 bg-surface-50 px-1.5 py-0.5 text-sm text-surface-900 outline-none dark:bg-surface-800 dark:text-surface-100"
					autofocus
				/>
			{:else}
				<button
					ondblclick={() => startEditTitle(task)}
					class="w-full cursor-text text-left text-sm text-surface-900 dark:text-surface-200"
					title="Double-click to edit"
				>
					{task.title}
				</button>
			{/if}
		</td>
		<td class="px-3 py-2">
			<select
				value={task.statusId}
				onchange={(e) => handleStatusChange(task, e.currentTarget.value)}
				class="w-full rounded border border-surface-300 bg-surface-50 px-1.5 py-0.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
			>
				{#each statuses.sort((a, b) => a.position - b.position) as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</td>
		<td class="px-3 py-2">
			<select
				value={task.assigneeId ?? ''}
				onchange={(e) => handleAssigneeChange(task, e.currentTarget.value)}
				class="w-full rounded border border-surface-300 bg-surface-50 px-1.5 py-0.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
			>
				<option value="">Unassigned</option>
				{#each members as member}
					<option value={member.id}>{member.name}</option>
				{/each}
			</select>
		</td>
		<td class="px-3 py-2 text-xs text-surface-600 dark:text-surface-400">
			{formatDate(task.dueDate)}
		</td>
		<td class="px-3 py-2 text-center text-xs text-surface-600 dark:text-surface-400">
			{task.estimatePoints ?? ''}
		</td>
	</tr>
{/snippet}
