<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import CompanyForm from '$lib/components/crm/CompanyForm.svelte';
	import ContactForm from '$lib/components/crm/ContactForm.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let showAddContact = $state(false);
	let tab = $state<'contacts' | 'opportunities' | 'activities' | 'tasks'>('contacts');

	async function deleteCompany() {
		if (!confirm('Delete this company? This will also delete all linked opportunities.')) return;
		try {
			await api(`/api/crm/companies/${data.company.id}`, { method: 'DELETE' });
			showToast('Company deleted');
			goto('/crm/companies');
		} catch {
			showToast('Failed to delete company', 'error');
		}
	}

	function activityTypeIcon(type: string) {
		switch (type) {
			case 'call': return '\u{1F4DE}';
			case 'email': return '\u{2709}\u{FE0F}';
			case 'meeting': return '\u{1F4C5}';
			case 'note': return '\u{1F4DD}';
			default: return '\u{1F4CB}';
		}
	}

	function relativeTime(ts: number) {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(ts).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>{data.company.name} | Companies</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<div class="flex items-center gap-2">
				<a href="/crm/companies" class="text-sm text-surface-500 hover:text-surface-300">&larr; Companies</a>
			</div>
			<h1 class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">{data.company.name}</h1>
			{#if data.company.website}
				<a href={data.company.website.startsWith('http') ? data.company.website : `https://${data.company.website}`} target="_blank" rel="noopener" class="text-sm text-brand-500 hover:underline">
					{data.company.website}
				</a>
			{/if}
		</div>
		<div class="flex gap-2">
			<button onclick={() => (showEdit = true)} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
				Edit
			</button>
			<button onclick={deleteCompany} class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
				Delete
			</button>
		</div>
	</div>

	<!-- Info grid -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900 md:grid-cols-4">
		<div>
			<p class="text-xs text-surface-500">Industry</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.company.industry || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Size</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.company.size || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Phone</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.company.phone || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Owner</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.owner?.name || '\u2014'}</p>
		</div>
		{#if data.company.address || data.company.city || data.company.state}
			<div class="col-span-2">
				<p class="text-xs text-surface-500">Address</p>
				<p class="text-sm text-surface-900 dark:text-surface-100">
					{[data.company.address, data.company.city, data.company.state].filter(Boolean).join(', ')}
				</p>
			</div>
		{/if}
		{#if data.company.notes}
			<div class="col-span-full">
				<p class="text-xs text-surface-500">Notes</p>
				<p class="mt-0.5 whitespace-pre-wrap text-sm text-surface-900 dark:text-surface-100">{data.company.notes}</p>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="mb-4 flex gap-4 border-b border-surface-300 dark:border-surface-800">
		{#each ['contacts', 'opportunities', 'activities', 'tasks'] as t}
			<button
				onclick={() => (tab = t as typeof tab)}
				class="border-b-2 px-1 pb-2 text-sm font-medium transition {tab === t ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
			>
				{t.charAt(0).toUpperCase() + t.slice(1)}
				{#if t === 'contacts'}({data.contacts.length}){/if}
				{#if t === 'opportunities'}({data.opportunities.length}){/if}
				{#if t === 'activities'}({data.activities.length}){/if}
				{#if t === 'tasks'}({data.tasks.length}){/if}
			</button>
		{/each}
	</div>

	<!-- Tab content -->
	{#if tab === 'contacts'}
		<div class="mb-3 flex justify-end">
			<button onclick={() => (showAddContact = true)} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500">
				Add Contact
			</button>
		</div>
		{#if data.contacts.length === 0}
			<p class="text-sm text-surface-500">No contacts at this company yet.</p>
		{:else}
			<div class="space-y-2">
				{#each data.contacts as contact (contact.id)}
					<a
						href="/crm/contacts/{contact.id}"
						class="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 p-3 transition hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:hover:bg-surface-800/50"
					>
						<div>
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">
								{contact.firstName} {contact.lastName}
								{#if contact.isPrimary}
									<span class="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">Primary</span>
								{/if}
							</p>
							{#if contact.title}
								<p class="text-xs text-surface-500">{contact.title}</p>
							{/if}
						</div>
						<div class="text-right text-xs text-surface-500">
							{#if contact.email}<p>{contact.email}</p>{/if}
							{#if contact.phone}<p>{contact.phone}</p>{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'opportunities'}
		{#if data.opportunities.length === 0}
			<p class="text-sm text-surface-500">No opportunities for this company yet.</p>
		{:else}
			<div class="space-y-2">
				{#each data.opportunities as opp (opp.id)}
					<a
						href="/crm/opportunities/{opp.id}"
						class="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 p-3 transition hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:hover:bg-surface-800/50"
					>
						<div>
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{opp.title}</p>
							<div class="mt-0.5 flex items-center gap-2">
								<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style="background-color: {opp.stageColor}">
									{opp.stageName}
								</span>
								{#if opp.priority === 'hot'}
									<span class="text-[10px] text-red-500">Hot</span>
								{:else if opp.priority === 'cold'}
									<span class="text-[10px] text-blue-500">Cold</span>
								{/if}
							</div>
						</div>
						<div class="text-right">
							{#if opp.value}
								<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{formatCurrency(opp.value, opp.currency)}</p>
							{/if}
							{#if opp.expectedCloseDate}
								<p class="text-xs text-surface-500">Close: {new Date(opp.expectedCloseDate).toLocaleDateString()}</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'activities'}
		{#if data.activities.length === 0}
			<p class="text-sm text-surface-500">No activities logged for this company yet.</p>
		{:else}
			<div class="space-y-3">
				{#each data.activities as activity (activity.id)}
					<div class="flex gap-3 rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
						<span class="text-lg">{activityTypeIcon(activity.type)}</span>
						<div class="flex-1">
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{activity.subject}</p>
							{#if activity.description}
								<p class="mt-0.5 text-xs text-surface-600 dark:text-surface-400 line-clamp-2">{activity.description}</p>
							{/if}
							<p class="mt-1 text-[10px] text-surface-500">{activity.userName} &middot; {relativeTime(activity.createdAt)}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'tasks'}
		{#if data.tasks.length === 0}
			<p class="text-sm text-surface-500">No tasks for this company yet.</p>
		{:else}
			<div class="space-y-2">
				{#each data.tasks as task (task.id)}
					<div class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900 {task.completedAt ? 'opacity-60' : ''}">
						<div class="flex-1">
							<p class="text-sm {task.completedAt ? 'line-through' : ''} text-surface-900 dark:text-surface-100">{task.title}</p>
							<div class="mt-0.5 flex items-center gap-2 text-[10px] text-surface-500">
								{#if task.assigneeName}<span>{task.assigneeName}</span>{/if}
								{#if task.dueDate}<span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<CompanyForm
	open={showEdit}
	onclose={() => (showEdit = false)}
	company={data.company}
	members={data.members}
/>

<ContactForm
	open={showAddContact}
	onclose={() => (showAddContact = false)}
	companies={data.crmCompanies}
	members={data.members}
	prefilledCompanyId={data.company.id}
/>
