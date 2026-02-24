<script lang="ts">
	import PipelineBoard from '$lib/components/crm/PipelineBoard.svelte';
	import OpportunityForm from '$lib/components/crm/OpportunityForm.svelte';
	import { formatCurrency } from '$lib/utils/currency.js';

	let { data } = $props();

	let showForm = $state(false);
	let search = $state('');
	let ownerFilter = $state('');
	let priorityFilter = $state('');

	const totalValue = $derived(
		data.opportunities
			.filter((o) => o.value)
			.reduce((sum, o) => sum + (o.value || 0), 0)
	);

	const filteredOpps = $derived.by(() => {
		let list = data.opportunities;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(
				(o) =>
					o.title.toLowerCase().includes(q) ||
					o.companyName.toLowerCase().includes(q)
			);
		}
		if (ownerFilter) list = list.filter((o) => o.ownerId === ownerFilter);
		if (priorityFilter) list = list.filter((o) => o.priority === priorityFilter);
		return list;
	});
</script>

<svelte:head>
	<title>Pipeline</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 pt-6 pb-4">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Pipeline</h1>
			<p class="text-sm text-surface-500">
				{data.opportunities.length} deals &middot; {formatCurrency(totalValue)} total
			</p>
		</div>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Add Opportunity
		</button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-3 px-6 pb-4">
		<input
			bind:value={search}
			placeholder="Search deals..."
			class="w-56 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		<select
			bind:value={ownerFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All owners</option>
			{#each data.members as m}
				<option value={m.id}>{m.name}</option>
			{/each}
		</select>
		<select
			bind:value={priorityFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All priorities</option>
			<option value="hot">Hot</option>
			<option value="warm">Warm</option>
			<option value="cold">Cold</option>
		</select>
	</div>

	<!-- Board -->
	<PipelineBoard
		stages={data.stages.filter((s) => !s.isClosed)}
		opportunities={filteredOpps}
		lastActivities={data.lastActivities}
	/>
</div>

<OpportunityForm
	open={showForm}
	onclose={() => (showForm = false)}
	companies={data.crmCompanies}
	stages={data.stages}
	members={data.members}
/>
