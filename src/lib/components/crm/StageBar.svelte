<script lang="ts">
	interface Stage {
		id: string;
		name: string;
		color: string;
		position: number;
		isClosed: boolean;
		isWon: boolean;
	}

	interface Props {
		stages: Stage[];
		currentStageId: string;
		onStageChange: (stageId: string) => void;
	}

	let { stages, currentStageId, onStageChange }: Props = $props();

	const sorted = $derived([...stages].sort((a, b) => a.position - b.position));
	const currentIndex = $derived(sorted.findIndex((s) => s.id === currentStageId));
</script>

<div class="flex items-center gap-1 overflow-x-auto rounded-lg border border-surface-300 bg-surface-50 p-2 dark:border-surface-800 dark:bg-surface-900">
	{#each sorted as stage, i (stage.id)}
		<button
			onclick={() => onStageChange(stage.id)}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition
				{i === currentIndex
					? 'text-white shadow-sm'
					: i < currentIndex
						? 'text-white/80'
						: 'text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-800'
				}
			"
			style={i <= currentIndex ? `background-color: ${stage.color}` : ''}
		>
			{#if i < currentIndex}
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			{/if}
			{stage.name}
		</button>
		{#if i < sorted.length - 1}
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-surface-400" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
			</svg>
		{/if}
	{/each}
</div>
