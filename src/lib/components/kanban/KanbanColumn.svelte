<script lang="ts">
	import TaskCard from '$lib/components/task/TaskCard.svelte';
	import InlineQuickAdd from '$lib/components/task/InlineQuickAdd.svelte';

	interface Status {
		id: string;
		name: string;
		color: string;
	}

	interface Task {
		id: string;
		number: number;
		title: string;
		type?: 'task' | 'bug' | 'feature' | 'improvement';
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		assigneeId?: string | null;
		assigneeName?: string | null;
		dueDate?: number | null;
		labels?: Array<{ name: string; color: string }>;
		checklistTotal?: number;
		checklistDone?: number;
		commentCount?: number;
		subtaskTotal?: number;
		subtaskDone?: number;
		position: number;
	}

	interface Props {
		status: Status;
		tasks: Task[];
		projectId: string;
		projectSlug: string;
		ondrop: (e: DragEvent, statusId: string) => void;
		ondragstart: (e: DragEvent, task: Task) => void;
		ontaskclick?: (task: Task) => void;
		focusedTaskId?: string | null;
	}

	let { status, tasks, projectId, projectSlug, ondrop, ondragstart, ontaskclick, focusedTaskId }: Props = $props();
	let dragover = $state(false);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragover = true;
	}

	function handleDragLeave() {
		dragover = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragover = false;
		ondrop(e, status.id);
	}
</script>

<div
	class="flex w-72 shrink-0 flex-col rounded-lg transition-all duration-150 {dragover ? 'bg-surface-200/60 ring-2 ring-brand-500/20 dark:bg-surface-800/60' : ''}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="list"
>
	<div class="mb-2 flex items-center gap-2 px-1">
		<div class="h-2.5 w-2.5 rounded-full" style="background-color: {status.color}"></div>
		<span class="text-xs font-semibold uppercase tracking-wide text-surface-600 dark:text-surface-400">{status.name}</span>
		<span class="text-xs text-surface-400 dark:text-surface-600">{tasks.length}</span>
	</div>

	<div class="flex flex-col gap-1.5">
		{#each tasks as task (task.id)}
			<TaskCard
				{task}
				{projectSlug}
				ondragstart={(e) => ondragstart(e, task)}
				onclick={ontaskclick ? () => ontaskclick(task) : undefined}
				focused={focusedTaskId === task.id}
			/>
		{/each}
		{#if tasks.length === 0}
			<div class="rounded-md border border-dashed border-surface-300 px-3 py-6 text-center text-xs text-surface-400 dark:border-surface-700">
				Drag tasks here
			</div>
		{/if}
	</div>

	<div class="mt-1.5 rounded-md border border-dashed border-surface-300 px-3 py-1.5 transition-colors focus-within:border-brand-400 focus-within:bg-surface-50 dark:border-surface-700 dark:focus-within:border-brand-600 dark:focus-within:bg-surface-800/50">
		<InlineQuickAdd {projectId} statusId={status.id} placeholder="+ Add task..." class="text-xs" />
	</div>
</div>
