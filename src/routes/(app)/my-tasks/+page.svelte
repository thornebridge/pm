<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();

	const openTasks = $derived(data.myTasks.filter((t) => !t.statusIsClosed));
	const closedTasks = $derived(data.myTasks.filter((t) => t.statusIsClosed));

	let showClosed = $state(false);
	let focusedIndex = $state(-1);

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

	// Flat list for J/K nav
	const flatTasks = $derived(grouped.flatMap((g) => g.tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])));

	const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

	function formatDate(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function isOverdue(ts: number | null): boolean {
		if (!ts) return false;
		return ts < Date.now();
	}

	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

		if (e.key === 'j') {
			e.preventDefault();
			focusedIndex = Math.min(focusedIndex + 1, flatTasks.length - 1);
		} else if (e.key === 'k') {
			e.preventDefault();
			focusedIndex = Math.max(focusedIndex - 1, 0);
		} else if (e.key === 'Enter' && focusedIndex >= 0 && flatTasks[focusedIndex]) {
			e.preventDefault();
			const task = flatTasks[focusedIndex];
			window.location.href = `/projects/${task.projectSlug}/task/${task.number}`;
		}
	}
</script>

<svelte:head>
	<title>My Tasks</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

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
		<EmptyState
			icon="\u2705"
			title="All clear!"
			description="No tasks assigned to you. Press N to quickly create one."
		/>
	{:else}
		{@const flatIdx = { current: 0 }}
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
							{@const idx = flatTasks.indexOf(task)}
							<a
								href="/projects/{group.projectSlug}/task/{task.number}"
								class="flex items-center gap-3 rounded-lg border bg-surface-50 px-3 py-2.5 transition hover:border-surface-400 dark:bg-surface-900 dark:hover:border-surface-700 {focusedIndex === idx ? 'border-brand-500 ring-1 ring-brand-500/30' : 'border-surface-300 dark:border-surface-800'}"
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
