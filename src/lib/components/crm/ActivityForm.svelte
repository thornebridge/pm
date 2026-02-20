<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		companies: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		prefilledCompanyId?: string;
		prefilledContactId?: string;
		prefilledOpportunityId?: string;
	}

	let { open, onclose, companies, members, prefilledCompanyId, prefilledContactId, prefilledOpportunityId }: Props = $props();

	let type = $state<'call' | 'email' | 'meeting' | 'note'>('note');
	let subject = $state('');
	let description = $state('');
	let companyId = $state('');
	let scheduledDateStr = $state('');
	let durationMinutes = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			type = 'note';
			subject = '';
			description = '';
			companyId = prefilledCompanyId || '';
			scheduledDateStr = '';
			durationMinutes = '';
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function save() {
		if (!subject.trim()) return;
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				type,
				subject: subject.trim(),
				description: description || null,
				companyId: companyId || null,
				contactId: prefilledContactId || null,
				opportunityId: prefilledOpportunityId || null,
				durationMinutes: durationMinutes ? parseInt(durationMinutes) : null
			};

			if (scheduledDateStr) {
				payload.scheduledAt = new Date(scheduledDateStr).getTime();
			}

			await api('/api/crm/activities', {
				method: 'POST',
				body: JSON.stringify(payload)
			});
			showToast('Activity logged');
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to log activity', 'error');
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

	const typeOptions = [
		{ value: 'call', label: 'Call', icon: '\u{1F4DE}' },
		{ value: 'email', label: 'Email', icon: '\u{2709}\u{FE0F}' },
		{ value: 'meeting', label: 'Meeting', icon: '\u{1F4C5}' },
		{ value: 'note', label: 'Note', icon: '\u{1F4DD}' }
	] as const;
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
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Log Activity</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<!-- Type selector -->
				<div class="flex gap-2">
					{#each typeOptions as opt}
						<button
							type="button"
							onclick={() => (type = opt.value)}
							class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition {type === opt.value ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
						>
							<span>{opt.icon}</span>
							{opt.label}
						</button>
					{/each}
				</div>

				<div>
					<label for="activity-subject" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Subject *</label>
					<input id="activity-subject" bind:this={inputEl} bind:value={subject} placeholder="What happened?" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>

				<div>
					<label for="activity-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea id="activity-desc" bind:value={description} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="activity-company" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company</label>
						<select id="activity-company" bind:value={companyId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">None</option>
							{#each companies as c}
								<option value={c.id}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="activity-duration" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Duration (min)</label>
						<input id="activity-duration" type="number" min="0" bind:value={durationMinutes} placeholder="30" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>

				{#if type === 'meeting' || type === 'call'}
					<div>
						<label for="activity-scheduled" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Scheduled Date/Time</label>
						<input id="activity-scheduled" type="datetime-local" bind:value={scheduledDateStr} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				{/if}

				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !subject.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : 'Log Activity'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
