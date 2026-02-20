<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		contact?: {
			id: string;
			firstName: string;
			lastName: string;
			companyId?: string | null;
			email?: string | null;
			phone?: string | null;
			title?: string | null;
			isPrimary?: boolean;
			source?: string | null;
			notes?: string | null;
			ownerId?: string | null;
		};
		companies: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		prefilledCompanyId?: string;
	}

	let { open, onclose, contact, companies, members, prefilledCompanyId }: Props = $props();

	let firstName = $state('');
	let lastName = $state('');
	let companyId = $state('');
	let email = $state('');
	let phone = $state('');
	let title = $state('');
	let isPrimary = $state(false);
	let source = $state('');
	let notes = $state('');
	let ownerId = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			if (contact) {
				firstName = contact.firstName;
				lastName = contact.lastName;
				companyId = contact.companyId || '';
				email = contact.email || '';
				phone = contact.phone || '';
				title = contact.title || '';
				isPrimary = contact.isPrimary || false;
				source = contact.source || '';
				notes = contact.notes || '';
				ownerId = contact.ownerId || '';
			} else {
				firstName = '';
				lastName = '';
				companyId = prefilledCompanyId || '';
				email = '';
				phone = '';
				title = '';
				isPrimary = false;
				source = '';
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
				companyId: companyId || null,
				email: email || null,
				phone: phone || null,
				title: title || null,
				isPrimary,
				source: source || null,
				notes: notes || null,
				ownerId: ownerId || null
			};

			if (contact) {
				await api(`/api/crm/contacts/${contact.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Contact updated');
			} else {
				await api('/api/crm/contacts', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Contact created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save contact', 'error');
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
					{contact ? 'Edit Contact' : 'Add Contact'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="contact-first" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">First Name *</label>
						<input id="contact-first" bind:this={inputEl} bind:value={firstName} placeholder="First name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="contact-last" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Last Name *</label>
						<input id="contact-last" bind:value={lastName} placeholder="Last name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="contact-email" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Email</label>
						<input id="contact-email" type="email" bind:value={email} placeholder="email@example.com" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="contact-phone" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Phone</label>
						<input id="contact-phone" bind:value={phone} placeholder="Phone" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div>
					<label for="contact-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Job Title</label>
					<input id="contact-title" bind:value={title} placeholder="e.g. VP of Sales" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label for="contact-company" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company</label>
					<select id="contact-company" bind:value={companyId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
						<option value="">None</option>
						{#each companies as c}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="contact-source" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Source</label>
						<select id="contact-source" bind:value={source} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
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
						<label for="contact-owner" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Owner</label>
						<select id="contact-owner" bind:value={ownerId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Unassigned</option>
							{#each members as m}
								<option value={m.id}>{m.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<input id="contact-primary" type="checkbox" bind:checked={isPrimary} class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
					<label for="contact-primary" class="text-sm text-surface-700 dark:text-surface-300">Primary contact</label>
				</div>
				<div>
					<label for="contact-notes" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Notes</label>
					<textarea id="contact-notes" bind:value={notes} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !firstName.trim() || !lastName.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : contact ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
