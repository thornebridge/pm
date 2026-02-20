<script lang="ts">
	import ActivityForm from '$lib/components/crm/ActivityForm.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let typeFilter = $state('');
	let userFilter = $state('');

	const filtered = $derived.by(() => {
		let list = data.activities;
		if (typeFilter) list = list.filter((a) => a.type === typeFilter);
		if (userFilter) list = list.filter((a) => a.userId === userFilter);
		return list;
	});

	function typeIcon(type: string) {
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
	<title>Activities</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Activities</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Log Activity
		</button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<select
			bind:value={typeFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All types</option>
			<option value="call">Calls</option>
			<option value="email">Emails</option>
			<option value="meeting">Meetings</option>
			<option value="note">Notes</option>
		</select>
		<select
			bind:value={userFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All users</option>
			{#each data.members as m}
				<option value={m.id}>{m.name}</option>
			{/each}
		</select>
	</div>

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<p class="text-sm text-surface-500">No activities logged yet.</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filtered as activity (activity.id)}
				<div class="flex gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
					<span class="text-xl">{typeIcon(activity.type)}</span>
					<div class="flex-1">
						<div class="flex items-start justify-between">
							<div>
								<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{activity.subject}</p>
								{#if activity.description}
									<p class="mt-0.5 text-xs text-surface-600 dark:text-surface-400 line-clamp-2">{activity.description}</p>
								{/if}
							</div>
							<span class="shrink-0 text-xs text-surface-500">{relativeTime(activity.createdAt)}</span>
						</div>
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<span class="text-[10px] text-surface-500">{activity.userName}</span>
							{#if activity.companyName}
								<a href="/crm/companies/{activity.companyId}" class="rounded-full bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-600 hover:underline dark:bg-surface-800 dark:text-surface-400">
									{activity.companyName}
								</a>
							{/if}
							{#if activity.contactName}
								<a href="/crm/contacts/{activity.contactId}" class="rounded-full bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-600 hover:underline dark:bg-surface-800 dark:text-surface-400">
									{activity.contactName}
								</a>
							{/if}
							{#if activity.opportunityTitle}
								<a href="/crm/opportunities/{activity.opportunityId}" class="rounded-full bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-600 hover:underline dark:bg-surface-800 dark:text-surface-400">
									{activity.opportunityTitle}
								</a>
							{/if}
							{#if activity.durationMinutes}
								<span class="text-[10px] text-surface-500">{activity.durationMinutes} min</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<ActivityForm
	open={showForm}
	onclose={() => (showForm = false)}
	companies={data.crmCompanies}
	members={data.members}
/>
