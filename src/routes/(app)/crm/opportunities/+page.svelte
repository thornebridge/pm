<script lang="ts">
	import OpportunityForm from '$lib/components/crm/OpportunityForm.svelte';
	import { formatCurrency } from '$lib/utils/currency.js';

	let { data } = $props();

	let showForm = $state(false);
	let search = $state('');
	let stageFilter = $state('');
	let ownerFilter = $state('');
	let priorityFilter = $state('');

	const filtered = $derived.by(() => {
		let list = data.opportunities;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(
				(o) =>
					o.title.toLowerCase().includes(q) ||
					o.companyName.toLowerCase().includes(q)
			);
		}
		if (stageFilter) list = list.filter((o) => o.stageId === stageFilter);
		if (ownerFilter) list = list.filter((o) => o.ownerId === ownerFilter);
		if (priorityFilter) list = list.filter((o) => o.priority === priorityFilter);
		return list;
	});
</script>

<svelte:head>
	<title>Opportunities</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Opportunities</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Add Opportunity
		</button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<input
			bind:value={search}
			placeholder="Search opportunities..."
			class="w-64 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		<select
			bind:value={stageFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All stages</option>
			{#each data.stages as s}
				<option value={s.id}>{s.name}</option>
			{/each}
		</select>
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

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<p class="text-sm text-surface-500">
				{search || stageFilter || ownerFilter || priorityFilter ? 'No opportunities match your filters.' : 'No opportunities yet. Add your first deal to get started.'}
			</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Title</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Company</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Stage</th>
						<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Value</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Prob</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Close Date</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Priority</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Owner</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as opp (opp.id)}
						<tr
							class="cursor-pointer border-b border-surface-200 transition hover:bg-surface-100 dark:border-surface-800 dark:hover:bg-surface-800/50"
							onclick={() => window.location.href = `/crm/opportunities/${opp.id}`}
						>
							<td class="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-100">{opp.title}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{opp.companyName}</td>
							<td class="px-4 py-2.5">
								<span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style="background-color: {opp.stageColor}">
									{opp.stageName}
								</span>
							</td>
							<td class="px-4 py-2.5 text-right font-medium text-surface-900 dark:text-surface-100">
								{opp.value ? formatCurrency(opp.value, opp.currency) : '\u2014'}
							</td>
							<td class="px-4 py-2.5 text-center text-surface-600 dark:text-surface-400">
								{opp.probability != null ? `${opp.probability}%` : '\u2014'}
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">
								{opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '\u2014'}
							</td>
							<td class="px-4 py-2.5 capitalize text-surface-600 dark:text-surface-400">{opp.priority}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{opp.ownerName || '\u2014'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<OpportunityForm
	open={showForm}
	onclose={() => (showForm = false)}
	companies={data.crmCompanies}
	stages={data.stages}
	members={data.members}
/>
