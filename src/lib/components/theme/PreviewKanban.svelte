<script lang="ts">
	const columns = [
		{
			name: 'To Do',
			cards: [
				{ title: 'Research competitors', tag: 'Research' },
				{ title: 'Plan sprint goals', tag: 'Planning' }
			]
		},
		{
			name: 'In Progress',
			cards: [
				{ title: 'Build dashboard UI', tag: 'Dev' }
			]
		},
		{
			name: 'Done',
			cards: [
				{ title: 'Setup CI/CD', tag: 'DevOps' }
			]
		}
	];
</script>

<div class="space-y-2">
	<h3 class="text-xs font-semibold text-surface-500" style="font-family: var(--font-heading);">Kanban</h3>
	<div class="flex" style="gap: var(--pm-d-gap);">
		{#each columns as col}
			<div class="flex-1 min-w-0">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-[10px] font-semibold text-surface-700 dark:text-surface-300">{col.name}</span>
					<span class="text-[9px] text-surface-500">{col.cards.length}</span>
				</div>
				<div class="space-y-1.5">
					{#each col.cards as card}
						<div
							class="pm-card pm-gradient relative overflow-hidden border bg-surface-50 dark:bg-surface-900"
							style="border-radius: var(--pm-r-md); padding: var(--pm-d-pad-y) var(--pm-d-pad-x); border-width: var(--pm-bw); border-color: var(--color-surface-300);"
						>
							<p class="truncate text-[10px] font-medium text-surface-900 dark:text-surface-100">{card.title}</p>
							<span class="mt-0.5 inline-block text-[8px] text-surface-500">{card.tag}</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
