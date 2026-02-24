<script lang="ts">
	import CompanyForm from '$lib/components/crm/CompanyForm.svelte';
	import ClickToCall from '$lib/components/crm/ClickToCall.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let search = $state('');
	let ownerFilter = $state('');
	let sortField = $state<'name' | 'created'>('created');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const filtered = $derived.by(() => {
		let list = data.companies;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter((c) => c.name.toLowerCase().includes(q));
		}
		if (ownerFilter) {
			list = list.filter((c) => c.ownerId === ownerFilter);
		}
		list = [...list].sort((a, b) => {
			if (sortField === 'name') {
				const cmp = a.name.localeCompare(b.name);
				return sortDir === 'asc' ? cmp : -cmp;
			}
			return sortDir === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
		});
		return list;
	});

	function toggleSort(field: 'name' | 'created') {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = field === 'name' ? 'asc' : 'desc';
		}
	}

	function sortIcon(field: string) {
		if (sortField !== field) return '';
		return sortDir === 'asc' ? ' \u2191' : ' \u2193';
	}
</script>

<svelte:head>
	<title>Companies</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Companies</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Add Company
		</button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<input
			bind:value={search}
			placeholder="Search companies..."
			class="w-64 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
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
	</div>

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<p class="text-sm text-surface-500">
				{search || ownerFilter ? 'No companies match your filters.' : 'No companies yet. Add your first company to get started.'}
			</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="cursor-pointer px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400" onclick={() => toggleSort('name')}>
							Name{sortIcon('name')}
						</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Industry</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Size</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Phone</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Owner</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Contacts</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Opps</th>
						<th class="cursor-pointer px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400" onclick={() => toggleSort('created')}>
							Created{sortIcon('created')}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as company (company.id)}
						<tr
							class="cursor-pointer border-b border-surface-200 transition hover:bg-surface-100 dark:border-surface-800 dark:hover:bg-surface-800/50"
							onclick={() => window.location.href = `/crm/companies/${company.id}`}
						>
							<td class="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-100">{company.name}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{company.industry || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{company.size || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400" onclick={(e) => e.stopPropagation()}>
								<ClickToCall
									phone={company.phone || ''}
									companyId={company.id}
									contactName={company.name}
									telnyxEnabled={data.telnyxEnabled}
								/>
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{company.ownerName || '\u2014'}</td>
							<td class="px-4 py-2.5 text-center text-surface-600 dark:text-surface-400">{company.contactCount}</td>
							<td class="px-4 py-2.5 text-center text-surface-600 dark:text-surface-400">{company.oppCount}</td>
							<td class="px-4 py-2.5 text-surface-500 dark:text-surface-500">{new Date(company.createdAt).toLocaleDateString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<CompanyForm
	open={showForm}
	onclose={() => (showForm = false)}
	members={data.members}
/>
