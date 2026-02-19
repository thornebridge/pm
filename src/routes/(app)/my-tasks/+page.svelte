<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';

	let { data } = $props();

	const openTasks = $derived(data.myTasks.filter((t) => !t.statusIsClosed));
	const closedTasks = $derived(data.myTasks.filter((t) => t.statusIsClosed));

	let showClosed = $state(false);

	const displayTasks = $derived(showClosed ? data.myTasks : openTasks);

	// Group by project
	const grouped = $derived.by(() => {
		const map = new Map<string, { projectName: string; projectSlug: string; projectColor: string; tasks: typeof displayTasks }>();
		for (const task of displayTasks) {
			const key = task.projectId;
			if (!map.has(key)) {
				map.set(key, {
					projectName: task.projectName,
					projectSlug: task.projectSlug,
					projectColor: task.projectColor,
					tasks: []
				});
			}
			map.get(key)!.tasks.push(task);
		}
		return [...map.values()];
	});

	const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

	function formatDate(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function isOverdue(ts: number | null): boolean {
		if (!ts) return false;
		return ts < Date.now();
	}
</script>

<svelte:head>
	<title>My Tasks</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">My Tasks</h1>
			<p class="text-xs text-surface-500">{openTasks.length} open &middot; {closedTasks.length} closed</p>
		</div>
		<label class="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
			<input
				type="checkbox"
				bind:checked={showClosed}
				class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
			/>
			Show closed
		</label>
	</div>

	{#if grouped.length === 0}
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-8 text-center dark:border-surface-800 dark:bg-surface-900">
			<p class="text-sm text-surface-500">No tasks assigned to you.</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each grouped as group}
				<section>
					<div class="mb-2 flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full" style="background-color: {group.projectColor}"></span>
						<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{group.projectName}</h2>
						<span class="text-xs text-surface-500">({group.tasks.length})</span>
					</div>

					<div class="space-y-1">
						{#each group.tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]) as task (task.id)}
							<a
								href="/projects/{group.projectSlug}/task/{task.number}"
								class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 transition hover:border-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
							>
								<PriorityIcon priority={task.priority} />
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm {task.statusIsClosed ? 'text-surface-500 line-through' : 'text-surface-900 dark:text-surface-200'}">
										{task.title}
									</p>
									<div class="flex items-center gap-2 text-xs text-surface-500">
										<span class="flex items-center gap-1">
											<span class="h-1.5 w-1.5 rounded-full" style="background-color: {task.statusColor}"></span>
											{task.statusName}
										</span>
										{#if task.dueDate}
											<span class={isOverdue(task.dueDate) && !task.statusIsClosed ? 'text-red-500' : ''}>
												Due {formatDate(task.dueDate)}
											</span>
										{/if}
										{#if task.estimatePoints}
											<span>{task.estimatePoints} pts</span>
										{/if}
									</div>
								</div>
								<span class="text-xs text-surface-400">#{task.number}</span>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
