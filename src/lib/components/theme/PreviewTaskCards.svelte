<script lang="ts">
	const tasks = [
		{ title: 'Design new landing page', tag: 'Design', tagColor: 'var(--color-brand-500)', status: 'In Progress' },
		{ title: 'Fix login validation bug', tag: 'Bug', tagColor: 'var(--color-error)', status: 'To Do' },
		{ title: 'Update API documentation', tag: 'Docs', tagColor: 'var(--color-info)', status: 'Done' }
	];
</script>

<div class="space-y-2">
	<h3 class="text-xs font-semibold text-surface-500" style="font-family: var(--font-heading);">Tasks</h3>
	{#each tasks as task}
		<div class="pm-card pm-gradient relative overflow-hidden border border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-900" style="border-radius: var(--pm-r-md); padding: var(--pm-d-pad); border-width: var(--pm-bw);">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<p class="truncate text-xs font-medium text-surface-900 dark:text-surface-100">{task.title}</p>
					<div class="mt-1 flex items-center gap-1.5">
						<span class="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium" style="background-color: {task.tagColor}20; color: {task.tagColor}; border-radius: var(--pm-r-full);">{task.tag}</span>
						<span class="text-[9px] text-surface-500">{task.status}</span>
					</div>
				</div>
				<span class="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-brand-500"></span>
			</div>
		</div>
	{/each}
</div>
