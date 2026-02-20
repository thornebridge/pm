<script lang="ts">
	import { showToast } from '$lib/stores/toasts.js';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { formatCurrency } from '$lib/utils/currency.js';

	interface Stage {
		id: string;
		name: string;
		color: string;
		position: number;
	}

	interface Opportunity {
		id: string;
		title: string;
		companyName: string;
		stageId: string;
		value: number | null;
		currency: string;
		priority: string;
		expectedCloseDate: number | null;
		position: number;
		ownerId: string | null;
		ownerName: string | null;
	}

	interface Props {
		stages: Stage[];
		opportunities: Opportunity[];
	}

	let { stages, opportunities }: Props = $props();

	let localOpps = $state<Opportunity[]>([]);
	let draggedOpp: Opportunity | null = $state(null);

	$effect(() => {
		localOpps = [...opportunities];
	});

	function oppsByStage(stageId: string) {
		return localOpps
			.filter((o) => o.stageId === stageId)
			.sort((a, b) => a.position - b.position);
	}

	function stageValue(stageId: string) {
		return oppsByStage(stageId).reduce((sum, o) => sum + (o.value || 0), 0);
	}

	function handleDragStart(e: DragEvent, opp: Opportunity) {
		draggedOpp = opp;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', opp.id);
		}
		const el = e.target as HTMLElement;
		el.classList.add('opacity-50');
	}

	function handleDragEnd(e: DragEvent) {
		const el = e.target as HTMLElement;
		el.classList.remove('opacity-50');
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	async function handleDrop(e: DragEvent, targetStageId: string) {
		e.preventDefault();
		if (!draggedOpp) return;

		const opp = draggedOpp;
		draggedOpp = null;

		document.querySelectorAll('.opacity-50').forEach((el) => el.classList.remove('opacity-50'));

		if (opp.stageId === targetStageId) return;

		const targetOpps = oppsByStage(targetStageId);
		const newPosition = targetOpps.length > 0 ? targetOpps[targetOpps.length - 1].position + 1 : 1;

		// Optimistic update
		localOpps = localOpps.map((o) =>
			o.id === opp.id ? { ...o, stageId: targetStageId, position: newPosition } : o
		);

		try {
			await api(`/api/crm/opportunities/${opp.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ stageId: targetStageId, position: newPosition })
			});
		} catch {
			showToast('Failed to move deal', 'error');
			await invalidateAll();
		}
	}

	function priorityColor(p: string) {
		if (p === 'hot') return 'bg-red-500';
		if (p === 'cold') return 'bg-blue-400';
		return 'bg-amber-400';
	}
</script>

<div class="flex flex-1 min-h-0 gap-4 overflow-x-auto px-6 pb-4">
	{#each stages.sort((a, b) => a.position - b.position) as stage (stage.id)}
		{@const stageOpps = oppsByStage(stage.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex w-72 shrink-0 flex-col rounded-lg border border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900/50"
			ondragover={handleDragOver}
			ondrop={(e) => handleDrop(e, stage.id)}
		>
			<!-- Column header -->
			<div class="flex items-center justify-between px-3 py-2.5 border-b border-surface-300 dark:border-surface-800">
				<div class="flex items-center gap-2">
					<div class="h-2.5 w-2.5 rounded-full" style="background-color: {stage.color}"></div>
					<span class="text-sm font-medium text-surface-900 dark:text-surface-100">{stage.name}</span>
					<span class="rounded-full bg-surface-200 px-1.5 py-0.5 text-[10px] font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-400">{stageOpps.length}</span>
				</div>
				{#if stageValue(stage.id) > 0}
					<span class="text-[10px] font-medium text-surface-500">{formatCurrency(stageValue(stage.id))}</span>
				{/if}
			</div>

			<!-- Cards -->
			<div class="flex-1 overflow-y-auto p-2 space-y-2">
				{#each stageOpps as opp (opp.id)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						draggable="true"
						ondragstart={(e) => handleDragStart(e, opp)}
						ondragend={handleDragEnd}
						class="cursor-grab rounded-lg border border-surface-300 bg-surface-50 p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-surface-700 dark:bg-surface-900"
					>
						<a href="/crm/opportunities/{opp.id}" class="block" onclick={(e) => e.stopPropagation()}>
							<div class="flex items-start justify-between gap-2">
								<p class="text-sm font-medium text-surface-900 dark:text-surface-100 line-clamp-2">{opp.title}</p>
								<div class="h-2 w-2 shrink-0 rounded-full mt-1.5 {priorityColor(opp.priority)}" title={opp.priority}></div>
							</div>
							<p class="mt-1 text-xs text-surface-500">{opp.companyName}</p>
							<div class="mt-2 flex items-center justify-between">
								{#if opp.value}
									<span class="text-xs font-medium text-surface-700 dark:text-surface-300">{formatCurrency(opp.value, opp.currency)}</span>
								{:else}
									<span></span>
								{/if}
								{#if opp.expectedCloseDate}
									<span class="text-[10px] text-surface-500">{new Date(opp.expectedCloseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
								{/if}
							</div>
							{#if opp.ownerName}
								<p class="mt-1.5 text-[10px] text-surface-400">{opp.ownerName}</p>
							{/if}
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
