<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		lead?: {
			id: string;
			firstName: string;
			lastName: string;
			email?: string | null;
			phone?: string | null;
			title?: string | null;
			companyName?: string | null;
			website?: string | null;
			industry?: string | null;
			companySize?: string | null;
			address?: string | null;
			source?: string | null;
			statusId: string;
			notes?: string | null;
			ownerId?: string | null;
		};
		statuses: Array<{ id: string; name: string; color: string }>;
		members: Array<{ id: string; name: string }>;
	}

	let { open, onclose, lead, statuses, members }: Props = $props();

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let title = $state('');
	let companyName = $state('');
	let website = $state('');
	let industry = $state('');
	let companySize = $state('');
	let address = $state('');
	let source = $state('');
	let statusId = $state('');
	let notes = $state('');
	let ownerId = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			if (lead) {
				firstName = lead.firstName;
				lastName = lead.lastName;
				email = lead.email || '';
				phone = lead.phone || '';
				title = lead.title || '';
				companyName = lead.companyName || '';
				website = lead.website || '';
				industry = lead.industry || '';
				companySize = lead.companySize || '';
				address = lead.address || '';
				source = lead.source || '';
				statusId = lead.statusId;
				notes = lead.notes || '';
				ownerId = lead.ownerId || '';
			} else {
				firstName = '';
				lastName = '';
				email = '';
				phone = '';
				title = '';
				companyName = '';
				website = '';
				industry = '';
				companySize = '';
				address = '';
				source = '';
				statusId = statuses[0]?.id || '';
				notes = '';
				ownerId = '';
			}
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function save() {
		if (!firstName.trim() || !lastName.trim()) return;
		saving = true;
		try {
			const payload = {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email || null,
				phone: phone || null,
				title: title || null,
				companyName: companyName || null,
				website: website || null,
				industry: industry || null,
				companySize: companySize || null,
				address: address || null,
				source: source || null,
				statusId,
				notes: notes || null,
				ownerId: ownerId || null
			};

			if (lead) {
				await api(`/api/crm/leads/${lead.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Lead updated');
			} else {
				await api('/api/crm/leads', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Lead created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save lead', 'error');
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
					{lead ? 'Edit Lead' : 'Add Lead'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="lead-first" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">First Name *</label>
						<input id="lead-first" bind:this={inputEl} bind:value={firstName} placeholder="First name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="lead-last" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Last Name *</label>
						<input id="lead-last" bind:value={lastName} placeholder="Last name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="lead-email" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Email</label>
						<input id="lead-email" type="email" bind:value={email} placeholder="email@example.com" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="lead-phone" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Phone</label>
						<input id="lead-phone" bind:value={phone} placeholder="Phone" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div>
					<label for="lead-company" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company Name</label>
					<input id="lead-company" bind:value={companyName} placeholder="Company name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="lead-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Job Title</label>
						<input id="lead-title" bind:value={title} placeholder="e.g. VP of Sales" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="lead-website" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Website</label>
						<input id="lead-website" bind:value={website} placeholder="https://..." class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="lead-industry" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Industry</label>
						<input id="lead-industry" bind:value={industry} placeholder="Industry" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="lead-size" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company Size</label>
						<select id="lead-size" bind:value={companySize} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">--</option>
							<option value="1-10">1-10</option>
							<option value="11-50">11-50</option>
							<option value="51-200">51-200</option>
							<option value="201-500">201-500</option>
							<option value="501-1000">501-1000</option>
							<option value="1000+">1000+</option>
						</select>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="lead-source" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Source</label>
						<select id="lead-source" bind:value={source} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">--</option>
							<option value="referral">Referral</option>
							<option value="inbound">Inbound</option>
							<option value="outbound">Outbound</option>
							<option value="website">Website</option>
							<option value="event">Event</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div>
						<label for="lead-status" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Status</label>
						<select id="lead-status" bind:value={statusId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							{#each statuses as s}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="lead-owner" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Owner</label>
						<select id="lead-owner" bind:value={ownerId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Unassigned</option>
							{#each members as m}
								<option value={m.id}>{m.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div>
					<label for="lead-notes" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Notes</label>
					<textarea id="lead-notes" bind:value={notes} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !firstName.trim() || !lastName.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : lead ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
