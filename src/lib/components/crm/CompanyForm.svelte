<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		company?: {
			id: string;
			name: string;
			website?: string | null;
			industry?: string | null;
			size?: string | null;
			phone?: string | null;
			address?: string | null;
			city?: string | null;
			state?: string | null;
			country?: string | null;
			notes?: string | null;
			ownerId?: string | null;
		};
		members: Array<{ id: string; name: string }>;
	}

	let { open, onclose, company, members }: Props = $props();

	let name = $state('');
	let website = $state('');
	let industry = $state('');
	let size = $state('');
	let phone = $state('');
	let address = $state('');
	let city = $state('');
	let state_ = $state('');
	let country = $state('US');
	let notes = $state('');
	let ownerId = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			if (company) {
				name = company.name;
				website = company.website || '';
				industry = company.industry || '';
				size = company.size || '';
				phone = company.phone || '';
				address = company.address || '';
				city = company.city || '';
				state_ = company.state || '';
				country = company.country || 'US';
				notes = company.notes || '';
				ownerId = company.ownerId || '';
			} else {
				name = '';
				website = '';
				industry = '';
				size = '';
				phone = '';
				address = '';
				city = '';
				state_ = '';
				country = 'US';
				notes = '';
				ownerId = '';
			}
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function save() {
		if (!name.trim()) return;
		saving = true;
		try {
			const payload = {
				name: name.trim(),
				website: website || null,
				industry: industry || null,
				size: size || null,
				phone: phone || null,
				address: address || null,
				city: city || null,
				state: state_ || null,
				country: country || 'US',
				notes: notes || null,
				ownerId: ownerId || null
			};

			if (company) {
				await api(`/api/crm/companies/${company.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Company updated');
			} else {
				await api('/api/crm/companies', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Company created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save company', 'error');
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
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{company ? 'Edit Company' : 'Add Company'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="company-name" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name *</label>
					<input
						id="company-name"
						bind:this={inputEl}
						bind:value={name}
						placeholder="Company name"
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="company-website" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Website</label>
						<input id="company-website" bind:value={website} placeholder="https://..." class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="company-industry" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Industry</label>
						<input id="company-industry" bind:value={industry} placeholder="e.g. Technology" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="company-size" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Size</label>
						<select id="company-size" bind:value={size} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">--</option>
							<option value="1-10">1-10</option>
							<option value="11-50">11-50</option>
							<option value="51-200">51-200</option>
							<option value="201-500">201-500</option>
							<option value="501-1000">501-1000</option>
							<option value="1000+">1000+</option>
						</select>
					</div>
					<div>
						<label for="company-phone" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Phone</label>
						<input id="company-phone" bind:value={phone} placeholder="Phone" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div>
					<label for="company-address" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Address</label>
					<input id="company-address" bind:value={address} placeholder="Street address" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="company-city" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">City</label>
						<input id="company-city" bind:value={city} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="company-state" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">State</label>
						<input id="company-state" bind:value={state_} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="company-country" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Country</label>
						<input id="company-country" bind:value={country} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div>
					<label for="company-owner" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Owner</label>
					<select id="company-owner" bind:value={ownerId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
						<option value="">Unassigned</option>
						{#each members as m}
							<option value={m.id}>{m.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="company-notes" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Notes</label>
					<textarea id="company-notes" bind:value={notes} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !name.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : company ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
