<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import PriorityIcon from './PriorityIcon.svelte';
	import TaskTypeIcon from './TaskTypeIcon.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MarkdownPreview from '$lib/components/markdown/MarkdownPreview.svelte';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { pushScope, popScope } from '$lib/utils/keyboard.js';
	import { onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	interface TaskDetail {
		id: string;
		number: number;
		title: string;
		description: string | null;
		type?: 'task' | 'bug' | 'feature' | 'improvement';
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		assigneeId: string | null;
		dueDate: number | null;
		startDate: number | null;
		estimatePoints: number | null;
		createdAt: number;
		updatedAt: number;
		projectId: string;
		labels: Array<{ id: string; name: string; color: string }>;
		activity: Array<{ id: string; action: string; detail: string | null; createdAt: number; userName: string }>;
		comments: Array<{ id: string; body: string; createdAt: number; userId: string; userName: string; updatedAt?: number }>;
		checklist: Array<{ id: string; title: string; completed: boolean; position: number }>;
	}

	interface Status {
		id: string;
		name: string;
		color: string;
		position: number;
	}

	interface Member {
		id: string;
		name: string;
	}

	interface Props {
		task: TaskDetail | null;
		statuses: Status[];
		members: Member[];
		projectSlug: string;
		currentUserId: string;
		onclose: () => void;
		onupdated: () => void;
	}

	let { task, statuses, members, projectSlug, currentUserId, onclose, onupdated }: Props = $props();

	let editingTitle = $state(false);
	let titleInput = $state('');
	let editingDescription = $state(false);
	let descriptionInput = $state('');
	let commentBody = $state('');
	let submitting = $state(false);
	let deleting = $state(false);

	// Contextual keyboard scope
	let scope: ReturnType<typeof pushScope> | null = null;

	$effect(() => {
		if (task) {
			titleInput = task.title;
			descriptionInput = task.description ?? '';
			editingTitle = false;
			editingDescription = false;
			commentBody = '';

			// Push contextual shortcuts
			if (scope) popScope(scope);
			const sortedStatuses = [...statuses].sort((a, b) => a.position - b.position);
			const priorities: Array<'urgent' | 'high' | 'medium' | 'low'> = ['urgent', 'high', 'medium', 'low'];
			scope = pushScope(
				{
					'1': () => sortedStatuses[0] && updateField('statusId', sortedStatuses[0].id),
					'2': () => sortedStatuses[1] && updateField('statusId', sortedStatuses[1].id),
					'3': () => sortedStatuses[2] && updateField('statusId', sortedStatuses[2].id),
					'4': () => sortedStatuses[3] && updateField('statusId', sortedStatuses[3].id),
					'e': () => (editingDescription = true),
					't': () => (editingTitle = true)
				},
				{
					'1': () => updateField('priority', priorities[0]),
					'2': () => updateField('priority', priorities[1]),
					'3': () => updateField('priority', priorities[2]),
					'4': () => updateField('priority', priorities[3])
				}
			);
		} else {
			if (scope) {
				popScope(scope);
				scope = null;
			}
		}
	});

	onDestroy(() => {
		if (scope) popScope(scope);
	});

	const statusMap = $derived(new Map(statuses.map((s) => [s.id, s])));
	const currentStatus = $derived(task ? statusMap.get(task.statusId) : null);
	const memberMap = $derived(new Map(members.map((m) => [m.id, m.name])));

	async function updateField(field: string, value: unknown) {
		if (!task) return;
		try {
			await api(`/api/projects/${task.projectId}/tasks/${task.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ [field]: value })
			});
			onupdated();
		} catch {
			showToast(`Failed to update ${field}`, 'error');
		}
	}

	async function saveTitle() {
		if (task && titleInput.trim() && titleInput !== task.title) {
			await updateField('title', titleInput);
		}
		editingTitle = false;
	}

	async function saveDescription() {
		if (!task) return;
		const newDesc = descriptionInput.trim() || null;
		if (newDesc !== (task.description ?? null)) {
			await updateField('description', newDesc);
		}
		editingDescription = false;
	}

	async function addComment() {
		if (!task || !commentBody.trim()) return;
		submitting = true;
		try {
			await api(`/api/projects/${task.projectId}/tasks/${task.id}/comments`, {
				method: 'POST',
				body: JSON.stringify({ body: commentBody })
			});
			commentBody = '';
			onupdated();
		} catch {
			showToast('Failed to add comment', 'error');
		} finally {
			submitting = false;
		}
	}

	async function toggleChecklistItem(itemId: string, completed: boolean) {
		if (!task) return;
		try {
			await api(`/api/projects/${task.projectId}/tasks/${task.id}/checklist/${itemId}`, {
				method: 'PATCH',
				body: JSON.stringify({ completed: !completed })
			});
			onupdated();
		} catch {
			showToast('Failed to update item', 'error');
		}
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}

	function formatDateInput(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toISOString().split('T')[0];
	}

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			created: 'created this task',
			status_changed: 'changed status',
			assigned: 'changed assignee',
			priority_changed: 'changed priority',
			commented: 'commented',
			label_added: 'added a label',
			label_removed: 'removed a label',
			edited: 'edited'
		};
		return labels[action] || action;
	}

	async function deleteTask() {
		if (!task || !confirm('Delete this task? This cannot be undone.')) return;
		deleting = true;
		try {
			await api(`/api/projects/${task.projectId}/tasks/${task.id}`, {
				method: 'DELETE'
			});
			showToast('Task deleted');
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to delete task', 'error');
		} finally {
			deleting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleCommentKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			addComment();
		}
	}
</script>

{#if task}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex justify-end"
		onkeydown={handleKeydown}
		onclick={handleBackdrop}
	>
		<div class="absolute inset-0 bg-black/30 dark:bg-black/50" transition:fade={{ duration: 150 }}></div>
		<div
			class="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			role="dialog"
			aria-modal="true"
			transition:fly={{ x: 300, duration: 200 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<div class="flex items-center gap-2">
					{#if task.type && task.type !== 'task'}
						<TaskTypeIcon type={task.type} />
					{/if}
					{#if currentStatus}
						<span class="h-2.5 w-2.5 rounded-full" style="background-color: {currentStatus.color}"></span>
						<span class="text-xs font-medium text-surface-600 dark:text-surface-400">{currentStatus.name}</span>
					{/if}
					<span class="text-xs text-surface-400">#{task.number}</span>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={deleteTask}
						disabled={deleting}
						class="rounded-md px-2 py-1 text-xs text-surface-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
						title="Delete task"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
					</button>
					<a
						href="/projects/{projectSlug}/task/{task.number}"
						class="rounded-md px-2 py-1 text-xs text-surface-500 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
						title="Open full page"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
							<path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
						</svg>
					</a>
					<button
						onclick={onclose}
						class="rounded-md p-1 text-surface-500 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
					>&times;</button>
				</div>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				<div class="p-4">
					<!-- Title -->
					<div class="mb-4">
						{#if editingTitle}
							<input
								bind:value={titleInput}
								onblur={saveTitle}
								onkeydown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { editingTitle = false; titleInput = task.title; } }}
								class="w-full rounded bg-surface-100 px-2 py-1 text-lg font-semibold text-surface-900 outline-none focus:ring-1 focus:ring-brand-500 dark:bg-surface-800 dark:text-surface-100"
								autofocus
							/>
						{:else}
							<button onclick={() => (editingTitle = true)} class="text-left text-lg font-semibold text-surface-900 hover:text-brand-600 dark:text-surface-100 dark:hover:text-white">
								{task.title}
							</button>
						{/if}
					</div>

					<!-- Metadata row -->
					<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div>
							<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Status</label>
							<select
								value={task.statusId}
								onchange={(e) => updateField('statusId', e.currentTarget.value)}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
							>
								{#each statuses as status}
									<option value={status.id}>{status.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Priority</label>
							<select
								value={task.priority}
								onchange={(e) => updateField('priority', e.currentTarget.value)}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
							>
								<option value="urgent">Urgent</option>
								<option value="high">High</option>
								<option value="medium">Medium</option>
								<option value="low">Low</option>
							</select>
						</div>
						<div>
							<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Assignee</label>
							<select
								value={task.assigneeId ?? ''}
								onchange={(e) => updateField('assigneeId', e.currentTarget.value || null)}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
							>
								<option value="">Unassigned</option>
								{#each members as member}
									<option value={member.id}>{member.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Due date</label>
							<input
								type="date"
								value={formatDateInput(task.dueDate)}
								onchange={(e) => updateField('dueDate', e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : null)}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
							/>
						</div>
					</div>

					<!-- Type selector -->
					<div class="mb-4">
						<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Type</label>
						<select
							value={task.type || 'task'}
							onchange={(e) => updateField('type', e.currentTarget.value)}
							class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
						>
							<option value="task">Task</option>
							<option value="bug">Bug</option>
							<option value="feature">Feature</option>
							<option value="improvement">Improvement</option>
						</select>
					</div>

					<!-- Recurrence indicator -->
					{#if task.recurrence}
						{@const rule = (() => { try { return JSON.parse(task.recurrence); } catch { return null; } })()}
						{#if rule}
							<div class="mb-4">
								<span class="text-[10px] font-medium uppercase tracking-wider text-surface-400">Repeat</span>
								<p class="text-xs text-surface-600 dark:text-surface-400">
									Every {rule.interval > 1 ? `${rule.interval} ` : ''}{rule.freq === 'daily' ? (rule.interval > 1 ? 'days' : 'day') : rule.freq === 'weekly' ? (rule.interval > 1 ? 'weeks' : 'week') : (rule.interval > 1 ? 'months' : 'month')}
								</p>
							</div>
						{/if}
					{/if}

					<!-- Labels -->
					{#if task.labels.length > 0}
						<div class="mb-4 flex flex-wrap gap-1">
							{#each task.labels as label}
								<Badge color={label.color}>{label.name}</Badge>
							{/each}
						</div>
					{/if}

					<!-- Description -->
					<div class="mb-4">
						<h3 class="mb-1 text-[10px] font-medium uppercase tracking-wider text-surface-400">Description</h3>
						{#if editingDescription}
							<textarea
								bind:value={descriptionInput}
								rows={5}
								placeholder="Add a description (markdown supported)..."
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							></textarea>
							<div class="mt-2 flex gap-2">
								<button onclick={saveDescription} class="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500">Save</button>
								<button onclick={() => { editingDescription = false; descriptionInput = task.description ?? ''; }} class="text-xs text-surface-600 hover:text-surface-900 dark:text-surface-400">Cancel</button>
							</div>
						{:else if task.description}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div onclick={() => (editingDescription = true)} onkeydown={() => {}} class="cursor-pointer rounded-md bg-surface-100 p-3 hover:ring-1 hover:ring-brand-500/30 dark:bg-surface-800/50">
								<MarkdownPreview content={task.description} />
							</div>
						{:else}
							<button onclick={() => (editingDescription = true)} class="w-full rounded-md border border-dashed border-surface-300 p-3 text-left text-xs text-surface-500 hover:border-brand-500 hover:text-brand-600 dark:border-surface-700">
								Add a description...
							</button>
						{/if}
					</div>

					<!-- Checklist -->
					{#if task.checklist.length > 0}
						{@const done = task.checklist.filter((i) => i.completed).length}
						<div class="mb-4">
							<div class="mb-1 flex items-center gap-2">
								<h3 class="text-[10px] font-medium uppercase tracking-wider text-surface-400">Checklist</h3>
								<span class="text-[10px] text-surface-400">{done}/{task.checklist.length}</span>
							</div>
							<div class="mb-2 h-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
								<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {task.checklist.length ? (done / task.checklist.length * 100) : 0}%"></div>
							</div>
							<div class="space-y-1">
								{#each task.checklist as item (item.id)}
									<div class="group flex items-center gap-2">
										<input
											type="checkbox"
											checked={item.completed}
											onchange={() => toggleChecklistItem(item.id, item.completed)}
											class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700"
										/>
										<span class="flex-1 text-xs {item.completed ? 'text-surface-400 line-through dark:text-surface-600' : 'text-surface-700 dark:text-surface-300'}">{item.title}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Activity + Comments -->
					<div>
						<h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-surface-400">Activity</h3>
						<div class="space-y-2">
							{#each task.activity as item (item.id)}
								<div class="flex items-start gap-2 text-xs">
									<Avatar name={item.userName} size="xs" />
									<div>
										<span class="font-medium text-surface-700 dark:text-surface-300">{item.userName}</span>
										<span class="text-surface-500">{actionLabel(item.action)}</span>
										<span class="ml-1 text-[10px] text-surface-400">{formatDate(item.createdAt)}</span>
									</div>
								</div>
							{/each}

							{#each task.comments as comment (comment.id)}
								<div class="rounded-md border border-surface-300 p-2.5 dark:border-surface-800">
									<div class="mb-1 flex items-center gap-2 text-[10px]">
										<Avatar name={comment.userName} size="xs" />
										<span class="font-medium text-surface-700 dark:text-surface-300">{comment.userName}</span>
										<span class="text-surface-400">{formatDate(comment.createdAt)}</span>
									</div>
									<div class="text-xs">
										<MarkdownPreview content={comment.body} />
									</div>
								</div>
							{/each}
						</div>

						<!-- Comment form -->
						<form onsubmit={(e) => { e.preventDefault(); addComment(); }} class="mt-3">
							<textarea
								bind:value={commentBody}
								onkeydown={handleCommentKeydown}
								placeholder="Write a comment... (Ctrl+Enter to submit)"
								rows={2}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-xs text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							></textarea>
							<div class="mt-1 flex justify-end">
								<button
									type="submit"
									disabled={submitting || !commentBody.trim()}
									class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
								>
									{submitting ? 'Posting...' : 'Comment'}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
