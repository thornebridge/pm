<script lang="ts">
	import ContactForm from '$lib/components/crm/ContactForm.svelte';
	import ClickToCall from '$lib/components/crm/ClickToCall.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let search = $state('');
	let companyFilter = $state('');
	let ownerFilter = $state('');
	let sourceFilter = $state('');

	const filtered = $derived.by(() => {
		let list = data.contacts;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(
				(c) =>
					c.firstName.toLowerCase().includes(q) ||
					c.lastName.toLowerCase().includes(q) ||
					(c.email && c.email.toLowerCase().includes(q))
			);
		}
		if (companyFilter) list = list.filter((c) => c.companyId === companyFilter);
		if (ownerFilter) list = list.filter((c) => c.ownerId === ownerFilter);
		if (sourceFilter) list = list.filter((c) => c.source === sourceFilter);
		return list;
	});
</script>

<svelte:head>
	<title>Contacts</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Contacts</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Add Contact
		</button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<input
			bind:value={search}
			placeholder="Search contacts..."
			class="w-64 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		<select
			bind:value={companyFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All companies</option>
			{#each data.crmCompanies as c}
				<option value={c.id}>{c.name}</option>
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
			<option value="referral">Referral</option>
			<option value="inbound">Inbound</option>
			<option value="outbound">Outbound</option>
			<option value="website">Website</option>
			<option value="event">Event</option>
			<option value="other">Other</option>
		</select>
	</div>

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<p class="text-sm text-surface-500">
				{search || companyFilter || ownerFilter || sourceFilter ? 'No contacts match your filters.' : 'No contacts yet. Add your first contact to get started.'}
			</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Email</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Phone</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Title</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Company</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Source</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Owner</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as contact (contact.id)}
						<tr
							class="cursor-pointer border-b border-surface-200 transition hover:bg-surface-100 dark:border-surface-800 dark:hover:bg-surface-800/50"
							onclick={() => window.location.href = `/crm/contacts/${contact.id}`}
						>
							<td class="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-100">
								{contact.firstName} {contact.lastName}
								{#if contact.isPrimary}
									<span class="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">Primary</span>
								{/if}
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{contact.email || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400" onclick={(e) => e.stopPropagation()}>
								<ClickToCall
									phone={contact.phone || ''}
									contactId={contact.id}
									companyId={contact.companyId}
									contactName="{contact.firstName} {contact.lastName}"
									telnyxEnabled={data.telnyxEnabled}
								/>
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{contact.title || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">
								{#if contact.companyName}
									<a href="/crm/companies/{contact.companyId}" class="text-brand-500 hover:underline" onclick={(e) => e.stopPropagation()}>{contact.companyName}</a>
								{:else}
									&mdash;
								{/if}
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400 capitalize">{contact.source || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{contact.ownerName || '\u2014'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<ContactForm
	open={showForm}
	onclose={() => (showForm = false)}
	companies={data.crmCompanies}
	members={data.members}
/>
