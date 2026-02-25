<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { invalidateAll } from '$app/navigation';
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import InlineQuickAdd from '$lib/components/task/InlineQuickAdd.svelte';
	import type { SortConfig, SortColumn, TaskGroup } from '$lib/types/filters.js';

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
		parentId: string | null;
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
		groups?: TaskGroup[] | null;
		statuses: Status[];
		projectSlug: string;
		projectId: string;
		members: Member[];
		sort?: SortConfig;
		onsortchange?: (partial: Partial<SortConfig>) => void;
		selectedIds?: string[];
		onselect?: (ids: string[]) => void;
		focusedIndex?: number;
	}

	let {
		tasks,
		groups = null,
		statuses,
		projectSlug,
		projectId,
		members,
		sort,
		onsortchange,
		selectedIds = $bindable([]),
		onselect,
		focusedIndex = -1
	}: Props = $props();

	let editingCell = $state<{ taskId: string; field: string } | null>(null);
	let editValue = $state('');

	const statusMap = $derived(new Map(statuses.map((s) => [s.id, s])));
	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	function toggleSort(column: SortColumn) {
		if (onsortchange) {
			if (sort?.column === column) {
				onsortchange({ direction: sort.direction === 'asc' ? 'desc' : 'asc' });
			} else {
				onsortchange({ column, direction: 'asc' });
			}
		}
	}

	function sortIndicator(column: SortColumn) {
		if (!sort || sort.column !== column) return '';
		return sort.direction === 'asc' ? ' \u2191' : ' \u2193';
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

	const allTaskIds = $derived(tasks.map((t) => t.id));
	const allSelected = $derived(allTaskIds.length > 0 && allTaskIds.every((id) => selectedIds.includes(id)));

	function toggleAll() {
		if (allSelected) {
			selectedIds = [];
		} else {
			selectedIds = [...allTaskIds];
		}
	}

	function toggleOne(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	function formatDate(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="px-6 pb-4">
	<!-- Table -->
	<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-surface-300 bg-surface-100 text-left text-xs font-medium uppercase tracking-wide text-surface-500 dark:border-surface-800 dark:bg-surface-800">
					<th class="w-8 px-2 py-2">
						<input
							type="checkbox"
							checked={allSelected}
							onchange={toggleAll}
							class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700"
						/>
					</th>
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
					<th class="w-16 px-3 py-2 select-none">
						Pts
					</th>
				</tr>
			</thead>
			<tbody>
				{#if groups}
					{@const flatOffset = { current: 0 }}
					{#each groups as group (group.key)}
						<tr>
							<td colspan="8" class="border-b border-surface-200 bg-surface-100/70 px-3 py-1.5 dark:border-surface-800/50 dark:bg-surface-800/40">
								<span class="flex items-center gap-2 text-xs font-semibold text-surface-700 dark:text-surface-300">
									{#if group.color}
										<span class="h-2.5 w-2.5 rounded-full" style="background-color: {group.color}"></span>
									{/if}
									{group.label}
									<span class="font-normal text-surface-500">({group.tasks.length})</span>
								</span>
							</td>
						</tr>
						{#each group.tasks as task (task.id)}
							{@render taskRow(task, flatOffset.current++)}
						{:else}
							<tr>
								<td colspan="8" class="border-b border-surface-200 px-3 py-2 text-center text-xs text-surface-400 dark:border-surface-800/50">
									No tasks
								</td>
							</tr>
						{/each}
					{/each}
				{:else}
					{#each tasks as task, i (task.id)}
						{@render taskRow(task, i)}
					{:else}
						<tr>
							<td colspan="8" class="px-3 py-8 text-center text-sm text-surface-500">No tasks found</td>
						</tr>
					{/each}
				{/if}
				<tr class="transition-colors focus-within:bg-surface-50 dark:focus-within:bg-surface-800/30">
					<td class="px-2 py-1.5"></td>
					<td class="px-3 py-1.5 text-xs text-surface-400">+</td>
					<td class="px-3 py-1.5"></td>
					<td colspan="5" class="px-3 py-1.5">
						<InlineQuickAdd {projectId} placeholder="Add task... (Enter to create)" class="text-surface-900 dark:text-surface-200" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>

{#snippet taskRow(task: Task, index: number)}
	{@const status = statusMap.get(task.statusId)}
	{@const assignee = memberMap.get(task.assigneeId ?? '')}
	<tr class="border-b border-surface-200 transition hover:bg-surface-100 dark:border-surface-800/50 dark:hover:bg-surface-800/30 {selectedIds.includes(task.id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''} {focusedIndex === index ? 'ring-1 ring-inset ring-brand-500/40' : ''}">
		<td class="px-2 py-2">
			<input
				type="checkbox"
				checked={selectedIds.includes(task.id)}
				onchange={() => toggleOne(task.id)}
				class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700"
			/>
		</td>
		<td class="px-3 py-2{task.parentId ? ' pl-6' : ''}">
			<a
				href="/projects/{projectSlug}/task/{task.number}"
				class="text-xs text-surface-500 hover:text-brand-600"
			>
				{#if task.parentId}<span class="mr-1 text-surface-400">└</span>{/if}{task.number}
			</a>
		</td>
		<td class="px-3 py-2">
			<PriorityIcon priority={task.priority} />
		</td>
		<td class="px-3 py-2">
			{#if editingCell?.taskId === task.id && editingCell?.field === 'title'}
				<!-- svelte-ignore a11y_autofocus -->
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
