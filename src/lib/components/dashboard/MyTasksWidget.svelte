<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: string;
		dueDate: number | null;
		statusName: string;
		statusColor: string;
		statusIsClosed: boolean;
		projectName: string;
		projectSlug: string;
		projectColor: string;
	}

	interface Props {
		tasks: Task[];
	}

	let { tasks }: Props = $props();

	const openTasks = $derived(tasks.filter((t) => !t.statusIsClosed));
</script>

<section>
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">My Tasks</h2>
		<span class="text-xs text-surface-500">{openTasks.length} open</span>
	</div>

	{#if openTasks.length === 0}
		<p class="rounded-lg border border-surface-300 bg-surface-50 p-4 text-sm text-surface-500 dark:border-surface-800 dark:bg-surface-900">
			No tasks assigned to you.
		</p>
	{:else}
		<div class="space-y-1">
			{#each openTasks as task (task.id)}
				<a
					href="/projects/{task.projectSlug}/task/{task.number}"
					class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 transition hover:border-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
				>
					<PriorityIcon priority={task.priority} />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm text-surface-900 dark:text-surface-200">{task.title}</p>
						<div class="flex items-center gap-2 text-xs text-surface-500">
							<span class="flex items-center gap-1">
								<span class="h-1.5 w-1.5 rounded-full" style="background-color: {task.projectColor}"></span>
								{task.projectName}
							</span>
							<span class="flex items-center gap-1">
								<span class="h-1.5 w-1.5 rounded-full" style="background-color: {task.statusColor}"></span>
								{task.statusName}
							</span>
						</div>
					</div>
					<span class="text-xs text-surface-400">#{task.number}</span>
				</a>
			{/each}
		</div>
	{/if}
</section>
