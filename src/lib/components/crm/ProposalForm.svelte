<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';
	import { parseCurrency } from '$lib/utils/currency.js';

	interface Props {
		open: boolean;
		onclose: () => void;
		opportunityId?: string;
	}

	let { open, onclose, opportunityId: prefilledOppId }: Props = $props();

	let opportunityId = $state('');
	let title = $state('');
	let description = $state('');
	let amountStr = $state('');
	let expiresDateStr = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	// Load opportunities for dropdown
	let opportunities = $state<Array<{ id: string; title: string }>>([]);

	$effect(() => {
		if (open) {
			opportunityId = prefilledOppId || '';
			title = '';
			description = '';
			amountStr = '';
			expiresDateStr = '';
			saving = false;
			loadOpportunities();
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function loadOpportunities() {
		try {
			const opps = await api<Array<{ id: string; title: string }>>('/api/crm/opportunities?limit=200');
			opportunities = opps;
		} catch {
			opportunities = [];
		}
	}

	async function save() {
		if (!title.trim() || !opportunityId) return;
		saving = true;
		try {
			const amount = amountStr ? parseCurrency(amountStr) : null;
			const expiresAt = expiresDateStr ? new Date(expiresDateStr).getTime() : null;

			await api('/api/crm/proposals', {
				method: 'POST',
				body: JSON.stringify({
					opportunityId,
					title: title.trim(),
					description: description || null,
					amount,
					expiresAt
				})
			});
			showToast('Proposal created');
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to create proposal', 'error');
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			save();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[10vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Create Proposal</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="proposal-opp" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Opportunity *</label>
					<select id="proposal-opp" bind:value={opportunityId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
						<option value="">Select opportunity</option>
						{#each opportunities as o}
							<option value={o.id}>{o.title}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="proposal-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Title *</label>
					<input id="proposal-title" bind:this={inputEl} bind:value={title} placeholder="Proposal title" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label for="proposal-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea id="proposal-desc" bind:value={description} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="proposal-amount" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Amount ($)</label>
						<input id="proposal-amount" bind:value={amountStr} placeholder="10000" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="proposal-expires" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Expires</label>
						<input id="proposal-expires" type="date" bind:value={expiresDateStr} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !title.trim() || !opportunityId} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Creating...' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
