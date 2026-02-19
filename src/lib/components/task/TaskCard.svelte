<script lang="ts">
	import PriorityIcon from './PriorityIcon.svelte';
	import TaskTypeIcon from './TaskTypeIcon.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		task: {
			id: string;
			number: number;
			title: string;
			type?: 'task' | 'bug' | 'feature' | 'improvement';
			priority: 'urgent' | 'high' | 'medium' | 'low';
			assigneeId?: string | null;
			assigneeName?: string | null;
			dueDate?: number | null;
			labels?: Array<{ name: string; color: string }>;
			checklistTotal?: number;
			checklistDone?: number;
			commentCount?: number;
			subtaskTotal?: number;
			subtaskDone?: number;
		};
		projectSlug: string;
		ondragstart?: (e: DragEvent) => void;
		onclick?: (e: MouseEvent) => void;
		focused?: boolean;
	}

	let { task, projectSlug, ondragstart, onclick, focused = false }: Props = $props();

	function handleClick(e: MouseEvent) {
		if (onclick) {
			e.preventDefault();
			onclick(e);
		}
	}

	const isOverdue = $derived(task.dueDate && task.dueDate < Date.now());

	function formatDue(ts: number): string {
		const diff = Math.ceil((ts - Date.now()) / 86400000);
		if (diff < -1) return `${Math.abs(diff)}d overdue`;
		if (diff === -1) return 'Yesterday';
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Tomorrow';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<a
	href="/projects/{projectSlug}/task/{task.number}"
	class="block rounded-md border p-3 transition-all duration-150 hover:shadow-sm {focused ? 'border-brand-500 ring-1 ring-brand-500/30' : 'border-surface-300 hover:border-surface-400 dark:border-surface-800 dark:hover:border-surface-700'} bg-surface-50 dark:bg-surface-900"
	draggable="true"
	ondragstart={ondragstart}
	onclick={handleClick}
	data-task-id={task.id}
>
	<div class="mb-1 flex items-center gap-1.5">
		{#if task.type && task.type !== 'task'}
			<TaskTypeIcon type={task.type} />
		{/if}
		<PriorityIcon priority={task.priority} />
		<span class="text-xs text-surface-500">#{task.number}</span>
		{#if task.assigneeName}
			<span class="ml-auto"><Avatar name={task.assigneeName} size="xs" /></span>
		{/if}
	</div>
	<p class="text-sm text-surface-900 dark:text-surface-200">{task.title}</p>

	<!-- Meta row -->
	{#if (task.labels && task.labels.length > 0) || task.dueDate || (task.checklistTotal && task.checklistTotal > 0) || (task.commentCount && task.commentCount > 0) || (task.subtaskTotal && task.subtaskTotal > 0)}
		<div class="mt-2 flex flex-wrap items-center gap-1.5">
			{#if task.labels && task.labels.length > 0}
				{#each task.labels as label}
					<Badge color={label.color}>{label.name}</Badge>
				{/each}
			{/if}

			{#if task.dueDate || (task.checklistTotal && task.checklistTotal > 0) || (task.commentCount && task.commentCount > 0) || (task.subtaskTotal && task.subtaskTotal > 0)}
				<span class="ml-auto flex items-center gap-2 text-[10px] text-surface-400">
					{#if task.subtaskTotal && task.subtaskTotal > 0}
						<span title="Subtasks">{task.subtaskDone}/{task.subtaskTotal} sub</span>
					{/if}
					{#if task.checklistTotal && task.checklistTotal > 0}
						<span class="flex items-center gap-0.5" title="Checklist">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
							{task.checklistDone}/{task.checklistTotal}
						</span>
					{/if}
					{#if task.commentCount && task.commentCount > 0}
						<span class="flex items-center gap-0.5" title="Comments">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" /></svg>
							{task.commentCount}
						</span>
					{/if}
					{#if task.dueDate}
						<span class={isOverdue ? 'text-red-500 font-medium' : ''}>{formatDue(task.dueDate)}</span>
					{/if}
				</span>
			{/if}
		</div>
	{/if}
</a>
