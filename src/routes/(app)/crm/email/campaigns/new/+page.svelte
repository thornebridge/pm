<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import ContactSelector from '$lib/components/crm/gmail/ContactSelector.svelte';

	let { data } = $props();

	let step = $state(1);
	let selectedContactIds = $state(new Set<string>());
	let selectedTemplateId = $state<string | null>(null);
	let campaignName = $state('');
	let creating = $state(false);
	let previewData = $state<Record<string, { subject: string; bodyHtml: string }>>({});
	let previewLoading = $state<string | null>(null);

	const selectedTemplate = $derived(data.templates.find((t) => t.id === selectedTemplateId));

	const selectedContacts = $derived(
		data.contacts.filter((c) => selectedContactIds.has(c.id) && c.email)
	);

	const estimatedTime = $derived(
		selectedContacts.length > 0
			? Math.ceil((selectedContacts.length * 2) / 60) + ' min'
			: '—'
	);

	function handleContactChange(ids: Set<string>) {
		selectedContactIds = ids;
	}

	async function loadPreview(contactId: string) {
		if (!selectedTemplateId || previewData[contactId]) return;
		previewLoading = contactId;
		try {
			const res = await api<{ subject: string; bodyHtml: string }>(
				`/api/crm/gmail/templates/${selectedTemplateId}/preview`,
				{ method: 'POST', body: JSON.stringify({ contactId }) }
			);
			previewData = { ...previewData, [contactId]: res };
		} catch {
			// Ignore preview errors
		} finally {
			previewLoading = null;
		}
	}

	async function createAndStart() {
		if (!selectedTemplateId || selectedContacts.length === 0 || !campaignName.trim()) return;
		creating = true;
		try {
			const campaign = await api<{ id: string }>('/api/crm/gmail/campaigns', {
				method: 'POST',
				body: JSON.stringify({
					name: campaignName.trim(),
					templateId: selectedTemplateId,
					contactIds: [...selectedContactIds]
				})
			});

			await api(`/api/crm/gmail/campaigns/${campaign.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status: 'queued' })
			});

			showToast('Campaign started');
			goto(`/crm/email/campaigns/${campaign.id}`);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to create campaign', 'error');
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>New Campaign | CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">New Campaign</h1>
		<a href="/crm/email/campaigns" class="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">Cancel</a>
	</div>

	<!-- Step indicator -->
	<div class="mb-6 flex items-center gap-2">
		{#each [
			{ num: 1, label: 'Select Recipients' },
			{ num: 2, label: 'Choose Template' },
			{ num: 3, label: 'Preview & Send' }
		] as s}
			<div class="flex items-center gap-2">
				<div class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
					{step >= s.num ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-500 dark:bg-surface-700'}">
					{s.num}
				</div>
				<span class="text-xs {step >= s.num ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400'}">{s.label}</span>
			</div>
			{#if s.num < 3}
				<div class="h-px flex-1 bg-surface-200 dark:bg-surface-700"></div>
			{/if}
		{/each}
	</div>

	<!-- Step 1: Select Recipients -->
	{#if step === 1}
		<div class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
			<h2 class="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Select Recipients</h2>
			<ContactSelector
				contacts={data.contacts}
				selectedIds={selectedContactIds}
				onchange={handleContactChange}
			/>
			<div class="mt-4 flex justify-end">
				<button
					onclick={() => (step = 2)}
					disabled={selectedContactIds.size === 0}
					class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					Next ({selectedContactIds.size} selected)
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 2: Choose Template -->
	{#if step === 2}
		<div class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
			<h2 class="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Choose Template</h2>

			<div class="mb-4">
				<label class="block text-xs font-medium text-surface-700 dark:text-surface-300">Campaign Name *
				<input
					bind:value={campaignName}
					placeholder="e.g., Q1 Outreach Wave 1"
					class="mt-1 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
				</label>
			</div>

			{#if data.templates.length === 0}
				<div class="rounded-md border border-dashed border-surface-300 py-6 text-center dark:border-surface-700">
					<p class="text-sm text-surface-500">No templates available</p>
					<a href="/crm/email/templates" class="mt-1 text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400">Create a template first</a>
				</div>
			{:else}
				<div class="space-y-2">
					{#each data.templates as template (template.id)}
						<button
							onclick={() => (selectedTemplateId = template.id)}
							class="w-full rounded-lg border p-3 text-left transition
								{selectedTemplateId === template.id
									? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20'
									: 'border-surface-200 hover:border-surface-300 dark:border-surface-700 dark:hover:border-surface-600'}"
						>
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-surface-900 dark:text-surface-100">{template.name}</span>
								{#if template.category}
									<span class="rounded-full bg-surface-100 px-1.5 py-0.5 text-[9px] text-surface-500 dark:bg-surface-700">{template.category}</span>
								{/if}
							</div>
							<p class="mt-0.5 text-xs text-surface-500">{template.subjectTemplate}</p>
							<p class="mt-1 line-clamp-2 text-xs text-surface-400">{template.bodyTemplate}</p>
						</button>
					{/each}
				</div>
			{/if}

			<div class="mt-4 flex justify-between">
				<button onclick={() => (step = 1)} class="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">Back</button>
				<button
					onclick={() => (step = 3)}
					disabled={!selectedTemplateId || !campaignName.trim()}
					class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					Next
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 3: Preview & Send -->
	{#if step === 3}
		<div class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
			<h2 class="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">Preview & Send</h2>

			<div class="mb-4 grid grid-cols-3 gap-4 rounded-md bg-surface-50 p-3 dark:bg-surface-800">
				<div>
					<span class="text-[10px] text-surface-400">Campaign</span>
					<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{campaignName}</p>
				</div>
				<div>
					<span class="text-[10px] text-surface-400">Template</span>
					<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{selectedTemplate?.name}</p>
				</div>
				<div>
					<span class="text-[10px] text-surface-400">Recipients / Est. Time</span>
					<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{selectedContacts.length} / ~{estimatedTime}</p>
				</div>
			</div>

			<div class="max-h-64 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700">
				{#each selectedContacts as contact (contact.id)}
					<div class="flex items-center justify-between border-b border-surface-100 px-3 py-2 last:border-0 dark:border-surface-800">
						<div class="min-w-0 flex-1">
							<span class="text-sm text-surface-900 dark:text-surface-100">{contact.firstName} {contact.lastName}</span>
							<span class="ml-2 text-xs text-surface-500">{contact.email}</span>
							{#if previewData[contact.id]}
								<p class="mt-0.5 truncate text-xs text-surface-400">Subj: {previewData[contact.id].subject}</p>
							{/if}
						</div>
						<button
							onclick={() => loadPreview(contact.id)}
							disabled={previewLoading === contact.id}
							class="shrink-0 text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400 disabled:opacity-50"
						>
							{previewLoading === contact.id ? 'Loading...' : previewData[contact.id] ? 'Previewed' : 'Preview'}
						</button>
					</div>
				{/each}
			</div>

			<div class="mt-4 flex justify-between">
				<button onclick={() => (step = 2)} class="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">Back</button>
				<button
					onclick={createAndStart}
					disabled={creating}
					class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{creating ? 'Creating...' : 'Start Campaign'}
				</button>
			</div>
		</div>
	{/if}
</div>
