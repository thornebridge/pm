<script lang="ts">
	import TaskCard from '$lib/components/task/TaskCard.svelte';

	interface Status {
		id: string;
		name: string;
		color: string;
	}

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		assigneeId?: string | null;
		labels?: Array<{ name: string; color: string }>;
		position: number;
	}

	interface Props {
		status: Status;
		tasks: Task[];
		projectSlug: string;
		ondrop: (e: DragEvent, statusId: string) => void;
		ondragstart: (e: DragEvent, task: Task) => void;
		ontaskclick?: (task: Task) => void;
	}

	let { status, tasks, projectSlug, ondrop, ondragstart, ontaskclick }: Props = $props();
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
	class="flex w-72 shrink-0 flex-col rounded-lg {dragover ? 'bg-surface-200/60 dark:bg-surface-800/60' : ''}"
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
			/>
		{/each}
	</div>
</div>
