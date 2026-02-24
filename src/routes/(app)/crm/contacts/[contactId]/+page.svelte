<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import ContactForm from '$lib/components/crm/ContactForm.svelte';
	import ClickToCall from '$lib/components/crm/ClickToCall.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let tab = $state<'details' | 'opportunities' | 'activities'>('details');

	async function deleteContact() {
		if (!confirm('Delete this contact?')) return;
		try {
			await api(`/api/crm/contacts/${data.contact.id}`, { method: 'DELETE' });
			showToast('Contact deleted');
			goto('/crm/contacts');
		} catch {
			showToast('Failed to delete contact', 'error');
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
	<title>{data.contact.firstName} {data.contact.lastName} | Contacts</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<a href="/crm/contacts" class="text-sm text-surface-500 hover:text-surface-300">&larr; Contacts</a>
			<h1 class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">
				{data.contact.firstName} {data.contact.lastName}
				{#if data.contact.isPrimary}
					<span class="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">Primary</span>
				{/if}
			</h1>
			{#if data.contact.title}
				<p class="text-sm text-surface-500">{data.contact.title}</p>
			{/if}
			{#if data.company}
				<a href="/crm/companies/{data.company.id}" class="text-sm text-brand-500 hover:underline">{data.company.name}</a>
			{/if}
		</div>
		<div class="flex gap-2">
			<button onclick={() => (showEdit = true)} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
				Edit
			</button>
			<button onclick={deleteContact} class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
				Delete
			</button>
		</div>
	</div>

	<!-- Info grid -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900 md:grid-cols-4">
		<div>
			<p class="text-xs text-surface-500">Email</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.contact.email || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Phone</p>
			<ClickToCall
				phone={data.contact.phone || ''}
				contactId={data.contact.id}
				companyId={data.contact.companyId}
				contactName="{data.contact.firstName} {data.contact.lastName}"
				telnyxEnabled={data.telnyxEnabled}
			/>
		</div>
		<div>
			<p class="text-xs text-surface-500">Source</p>
			<p class="text-sm capitalize text-surface-900 dark:text-surface-100">{data.contact.source || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Owner</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.owner?.name || '\u2014'}</p>
		</div>
		{#if data.contact.notes}
			<div class="col-span-full">
				<p class="text-xs text-surface-500">Notes</p>
				<p class="mt-0.5 whitespace-pre-wrap text-sm text-surface-900 dark:text-surface-100">{data.contact.notes}</p>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="mb-4 flex gap-4 border-b border-surface-300 dark:border-surface-800">
		{#each [{ key: 'opportunities', label: `Opportunities (${data.opportunities.length})` }, { key: 'activities', label: `Activities (${data.activities.length})` }] as t}
			<button
				onclick={() => (tab = t.key as typeof tab)}
				class="border-b-2 px-1 pb-2 text-sm font-medium transition {tab === t.key ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
			>
				{t.label}
			</button>
		{/each}
	</div>

	{#if tab === 'opportunities'}
		{#if data.opportunities.length === 0}
			<p class="text-sm text-surface-500">No linked opportunities.</p>
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
								<span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style="background-color: {opp.stageColor}">{opp.stageName}</span>
								{#if opp.role}
									<span class="text-[10px] text-surface-500 capitalize">{opp.role}</span>
								{/if}
							</div>
						</div>
						{#if opp.value}
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{formatCurrency(opp.value, opp.currency)}</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'activities'}
		{#if data.activities.length === 0}
			<p class="text-sm text-surface-500">No activities logged for this contact yet.</p>
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
</div>

<ContactForm
	open={showEdit}
	onclose={() => (showEdit = false)}
	contact={data.contact}
	companies={data.crmCompanies}
	members={data.members}
/>
