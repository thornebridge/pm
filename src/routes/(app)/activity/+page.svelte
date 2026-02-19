<script lang="ts">
	let { data } = $props();

	let filterProject = $state('');

	const projectNames = $derived(() => {
		const names = new Map<string, { name: string; color: string }>();
		for (const item of data.activity) {
			if (!names.has(item.projectSlug)) {
				names.set(item.projectSlug, { name: item.projectName, color: item.projectColor });
			}
		}
		return [...names.entries()];
	});

	const filteredActivity = $derived(() => {
		if (!filterProject) return data.activity;
		return data.activity.filter((a) => a.projectSlug === filterProject);
	});

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			created: 'created',
			status_changed: 'moved',
			assigned: 'assigned',
			priority_changed: 'reprioritized',
			commented: 'commented on',
			label_added: 'labeled',
			label_removed: 'unlabeled',
			edited: 'edited',
			attachment_added: 'attached file to',
			attachment_removed: 'removed file from'
		};
		return labels[action] || action;
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	// Group by date
	const groupedByDate = $derived(() => {
		const groups = new Map<string, typeof data.activity>();
		for (const item of filteredActivity()) {
			const date = formatDate(item.createdAt);
			const arr = groups.get(date) || [];
			arr.push(item);
			groups.set(date, arr);
		}
		return [...groups.entries()];
	});
</script>

<svelte:head>
	<title>Activity</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Activity Feed</h1>
		<select
			bind:value={filterProject}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
		>
			<option value="">All projects</option>
			{#each projectNames() as [slug, info]}
				<option value={slug}>{info.name}</option>
			{/each}
		</select>
	</div>

	{#if filteredActivity().length === 0}
		<p class="text-sm text-surface-500">No activity yet.</p>
	{:else}
		<div class="space-y-6">
			{#each groupedByDate() as [date, items]}
				<section>
					<h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">{date}</h2>
					<div class="space-y-1">
						{#each items as item (item.id)}
							<div class="rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 dark:border-surface-800 dark:bg-surface-900">
								<div class="text-xs text-surface-500">
									<span class="font-medium text-surface-700 dark:text-surface-300">{item.userName}</span>
									{actionLabel(item.action)}
									<a href="/projects/{item.projectSlug}/task/{item.taskNumber}" class="font-medium text-surface-700 hover:text-brand-600 dark:text-surface-300">
										#{item.taskNumber} {item.taskTitle}
									</a>
								</div>
								<div class="mt-0.5 flex items-center gap-2 text-[10px] text-surface-400">
									<span class="flex items-center gap-1">
										<span class="h-1.5 w-1.5 rounded-full" style="background-color: {item.projectColor}"></span>
										{item.projectName}
									</span>
									<span>{timeAgo(item.createdAt)}</span>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
