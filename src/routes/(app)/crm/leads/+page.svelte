<script lang="ts">
	import LeadForm from '$lib/components/crm/LeadForm.svelte';
	import LeadStatusBadge from '$lib/components/crm/LeadStatusBadge.svelte';
	import CsvImportModal from '$lib/components/crm/CsvImportModal.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let showImport = $state(false);
	let search = $state('');
	let statusFilter = $state('');
	let ownerFilter = $state('');
	let sourceFilter = $state('');
	let showConverted = $state(false);

	const filtered = $derived.by(() => {
		let list = data.leads;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(
				(l) =>
					l.firstName.toLowerCase().includes(q) ||
					l.lastName.toLowerCase().includes(q) ||
					(l.email && l.email.toLowerCase().includes(q)) ||
					(l.companyName && l.companyName.toLowerCase().includes(q))
			);
		}
		if (statusFilter) list = list.filter((l) => l.statusId === statusFilter);
		if (ownerFilter) list = list.filter((l) => l.ownerId === ownerFilter);
		if (sourceFilter) list = list.filter((l) => l.source === sourceFilter);
		return list;
	});

	const sources = ['referral', 'inbound', 'outbound', 'website', 'event', 'csv_import', 'other'];
</script>

<svelte:head>
	<title>Leads</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Leads</h1>
		<div class="flex gap-2">
			<button
				onclick={() => (showImport = true)}
				class="rounded-md border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 transition hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
			>
				Import CSV
			</button>
			<button
				onclick={() => (showForm = true)}
				class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
			>
				Add Lead
			</button>
		</div>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<input
			bind:value={search}
			placeholder="Search leads..."
			class="w-64 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		<select
			bind:value={statusFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All statuses</option>
			{#each data.leadStatuses as s}
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
			bind:value={sourceFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All sources</option>
			{#each sources as s}
				<option value={s}>{s.replace('_', ' ')}</option>
			{/each}
		</select>
	</div>

	{#if filtered.length === 0}
		<div class="py-16 text-center text-sm text-surface-500">
			{data.leads.length === 0 ? 'No leads yet. Add your first lead or import a CSV.' : 'No leads match your filters.'}
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-800">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-surface-200 bg-surface-100/50 dark:border-surface-800 dark:bg-surface-900/50">
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Email</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Company</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Status</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Source</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Owner</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-200 dark:divide-surface-800">
					{#each filtered as lead}
						<tr
							class="cursor-pointer transition hover:bg-surface-100 dark:hover:bg-surface-800/50"
							onclick={() => window.location.href = `/crm/leads/${lead.id}`}
						>
							<td class="px-3 py-2.5 font-medium text-surface-900 dark:text-surface-100">
								{lead.firstName} {lead.lastName}
							</td>
							<td class="px-3 py-2.5 text-surface-600 dark:text-surface-400">{lead.email || '—'}</td>
							<td class="px-3 py-2.5 text-surface-600 dark:text-surface-400">{lead.companyName || '—'}</td>
							<td class="px-3 py-2.5">
								{#if lead.statusName && lead.statusColor}
									<LeadStatusBadge name={lead.statusName} color={lead.statusColor} />
								{/if}
							</td>
							<td class="px-3 py-2.5 text-surface-600 dark:text-surface-400 capitalize">{lead.source?.replace('_', ' ') || '—'}</td>
							<td class="px-3 py-2.5 text-surface-600 dark:text-surface-400">{lead.ownerName || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-2 text-xs text-surface-500">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</div>
	{/if}
</div>

<LeadForm open={showForm} onclose={() => (showForm = false)} statuses={data.leadStatuses} members={data.members} />
<CsvImportModal open={showImport} onclose={() => (showImport = false)} statuses={data.leadStatuses} />
