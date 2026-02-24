<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		lead: {
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
			ownerId?: string | null;
		};
		stages: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
	}

	let { open, onclose, lead, stages, members }: Props = $props();

	// Company fields
	let companyName = $state('');
	let website = $state('');
	let industry = $state('');
	let companySize = $state('');
	let address = $state('');

	// Contact fields
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let contactTitle = $state('');

	// Opportunity fields
	let createOpportunity = $state(true);
	let opportunityTitle = $state('');
	let stageId = $state('');
	let value = $state('');
	let priority = $state('warm');

	let saving = $state(false);

	$effect(() => {
		if (open) {
			companyName = lead.companyName || '';
			website = lead.website || '';
			industry = lead.industry || '';
			companySize = lead.companySize || '';
			address = lead.address || '';
			firstName = lead.firstName;
			lastName = lead.lastName;
			email = lead.email || '';
			phone = lead.phone || '';
			contactTitle = lead.title || '';
			createOpportunity = true;
			opportunityTitle = lead.companyName ? `${lead.companyName} - New Opportunity` : 'New Opportunity';
			stageId = stages[0]?.id || '';
			value = '';
			priority = 'warm';
			saving = false;
		}
	});

	async function convert() {
		if (!companyName.trim()) {
			showToast('Company name is required', 'error');
			return;
		}
		if (!firstName.trim() || !lastName.trim()) {
			showToast('Contact name is required', 'error');
			return;
		}
		if (createOpportunity && !opportunityTitle.trim()) {
			showToast('Opportunity title is required', 'error');
			return;
		}

		saving = true;
		try {
			const payload: Record<string, unknown> = {
				companyName: companyName.trim(),
				website: website || null,
				industry: industry || null,
				companySize: companySize || null,
				address: address || null,
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email || null,
				phone: phone || null,
				contactTitle: contactTitle || null,
				createOpportunity
			};

			if (createOpportunity) {
				payload.opportunityTitle = opportunityTitle.trim();
				payload.stageId = stageId || null;
				payload.value = value ? parseInt(value) : null;
				payload.priority = priority;
			}

			const result = await api(`/api/crm/leads/${lead.id}/convert`, {
				method: 'POST',
				body: JSON.stringify(payload)
			});

			showToast('Lead converted successfully');
			onclose();

			const data = await result.json();
			if (data.opportunity?.id) {
				goto(`/crm/opportunities/${data.opportunity.id}`);
			} else if (data.company?.id) {
				goto(`/crm/companies/${data.company.id}`);
			} else {
				await invalidateAll();
			}
		} catch {
			showToast('Failed to convert lead', 'error');
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[5vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-xl rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Convert Lead</h2>
				<p class="text-xs text-surface-500">Create Company, Contact{createOpportunity ? ', and Opportunity' : ''} from this lead</p>
			</div>

			<div class="max-h-[70vh] overflow-y-auto p-4 space-y-5">
				<!-- Company Section -->
				<div>
					<h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Company</h3>
					<div class="space-y-2">
						<div>
							<label for="conv-company" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company Name *</label>
							<input id="conv-company" bind:value={companyName} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="conv-website" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Website</label>
								<input id="conv-website" bind:value={website} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
							<div>
								<label for="conv-industry" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Industry</label>
								<input id="conv-industry" bind:value={industry} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
						</div>
					</div>
				</div>

				<!-- Contact Section -->
				<div>
					<h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Contact</h3>
					<div class="space-y-2">
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="conv-first" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">First Name *</label>
								<input id="conv-first" bind:value={firstName} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
							<div>
								<label for="conv-last" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Last Name *</label>
								<input id="conv-last" bind:value={lastName} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="conv-email" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Email</label>
								<input id="conv-email" type="email" bind:value={email} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
							<div>
								<label for="conv-phone" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Phone</label>
								<input id="conv-phone" bind:value={phone} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
						</div>
						<div>
							<label for="conv-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Job Title</label>
							<input id="conv-title" bind:value={contactTitle} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
						</div>
					</div>
				</div>

				<!-- Opportunity Section -->
				<div>
					<div class="mb-2 flex items-center gap-2">
						<input id="conv-create-opp" type="checkbox" bind:checked={createOpportunity} class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
						<label for="conv-create-opp" class="text-xs font-semibold uppercase tracking-wider text-surface-500">Create Opportunity</label>
					</div>
					{#if createOpportunity}
						<div class="space-y-2">
							<div>
								<label for="conv-opp-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Opportunity Title *</label>
								<input id="conv-opp-title" bind:value={opportunityTitle} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</div>
							<div class="grid grid-cols-3 gap-2">
								<div>
									<label for="conv-stage" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Stage</label>
									<select id="conv-stage" bind:value={stageId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
										{#each stages as s}
											<option value={s.id}>{s.name}</option>
										{/each}
									</select>
								</div>
								<div>
									<label for="conv-value" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Value (cents)</label>
									<input id="conv-value" type="number" bind:value={value} placeholder="0" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
								</div>
								<div>
									<label for="conv-priority" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Priority</label>
									<select id="conv-priority" bind:value={priority} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
										<option value="hot">Hot</option>
										<option value="warm">Warm</option>
										<option value="cold">Cold</option>
									</select>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 border-t border-surface-300 px-4 py-3 dark:border-surface-800">
				<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
				<button
					onclick={convert}
					disabled={saving || !companyName.trim() || !firstName.trim() || !lastName.trim() || (createOpportunity && !opportunityTitle.trim())}
					class="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
				>
					{saving ? 'Converting...' : 'Convert Lead'}
				</button>
			</div>
		</div>
	</div>
{/if}
