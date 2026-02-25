<script lang="ts">
	import { fly } from 'svelte/transition';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	interface Props {
		threadId: string;
		open: boolean;
		onclose: () => void;
		oncreated: () => void;
	}

	let { threadId, open, onclose, oncreated }: Props = $props();

	let showCustomFollowUp = $state(false);
	let showCustomSnooze = $state(false);
	let customDate = $state('');
	let customTime = $state('08:00');
	let creating = $state(false);

	function resetCustom() {
		showCustomFollowUp = false;
		showCustomSnooze = false;
		customDate = '';
		customTime = '08:00';
	}

	$effect(() => {
		if (open) resetCustom();
	});

	async function createReminder(type: 'follow_up' | 'snooze', opts: { delayDays?: number; remindAt?: number }) {
		creating = true;
		try {
			await api(`/api/crm/gmail/threads/${threadId}/remind`, {
				method: 'POST',
				body: JSON.stringify({ type, ...opts })
			});

			const when = opts.remindAt
				? new Date(opts.remindAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
				: `${opts.delayDays} day${opts.delayDays !== 1 ? 's' : ''}`;

			showToast(type === 'follow_up' ? `Follow-up reminder set for ${when}` : `Snoozed until ${when}`);
			oncreated();
			onclose();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to set reminder', 'error');
		} finally {
			creating = false;
		}
	}

	function handleCustomSubmit(type: 'follow_up' | 'snooze') {
		if (!customDate) return;
		const dateStr = `${customDate}T${customTime}`;
		const remindAt = new Date(dateStr).getTime();
		if (remindAt <= Date.now()) {
			showToast('Choose a future date', 'error');
			return;
		}
		createReminder(type, { remindAt });
	}

	function getNextMondayAt8(): number {
		const now = new Date();
		const day = now.getDay();
		const daysUntilMonday = day === 0 ? 1 : 8 - day;
		const monday = new Date(now);
		monday.setDate(monday.getDate() + daysUntilMonday);
		monday.setHours(8, 0, 0, 0);
		return monday.getTime();
	}

	function getTomorrowAt8(): number {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(8, 0, 0, 0);
		return tomorrow.getTime();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-surface-300 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800"
		transition:fly={{ y: -8, duration: 150 }}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	>
		<!-- Follow up section -->
		<div class="border-b border-surface-200 p-2 dark:border-surface-700">
			<p class="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">Follow up if no reply</p>
			{#if showCustomFollowUp}
				<div class="flex items-center gap-1.5 px-1">
					<input type="date" bind:value={customDate} class="flex-1 rounded border border-surface-300 bg-surface-50 px-1.5 py-1 text-xs dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200" />
					<button onclick={() => handleCustomSubmit('follow_up')} disabled={creating || !customDate} class="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-400 disabled:opacity-50">Set</button>
					<button onclick={() => (showCustomFollowUp = false)} class="text-xs text-surface-400">&times;</button>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-1">
					<button onclick={() => createReminder('follow_up', { delayDays: 1 })} disabled={creating} class="rounded px-2 py-1.5 text-left text-xs text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700 disabled:opacity-50">1 day</button>
					<button onclick={() => createReminder('follow_up', { delayDays: 3 })} disabled={creating} class="rounded px-2 py-1.5 text-left text-xs text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700 disabled:opacity-50">3 days</button>
					<button onclick={() => createReminder('follow_up', { delayDays: 7 })} disabled={creating} class="rounded px-2 py-1.5 text-left text-xs text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700 disabled:opacity-50">1 week</button>
					<button onclick={() => (showCustomFollowUp = true)} class="rounded px-2 py-1.5 text-left text-xs text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-700">Custom...</button>
				</div>
			{/if}
		</div>

		<!-- Snooze section -->
		<div class="p-2">
			<p class="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">Snooze thread</p>
			{#if showCustomSnooze}
				<div class="flex items-center gap-1.5 px-1">
					<input type="date" bind:value={customDate} class="flex-1 rounded border border-surface-300 bg-surface-50 px-1.5 py-1 text-xs dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200" />
					<input type="time" bind:value={customTime} class="w-20 rounded border border-surface-300 bg-surface-50 px-1.5 py-1 text-xs dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200" />
					<button onclick={() => handleCustomSubmit('snooze')} disabled={creating || !customDate} class="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-400 disabled:opacity-50">Set</button>
					<button onclick={() => (showCustomSnooze = false)} class="text-xs text-surface-400">&times;</button>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-1">
					<button onclick={() => createReminder('snooze', { remindAt: getTomorrowAt8() })} disabled={creating} class="rounded px-2 py-1.5 text-left text-xs text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700 disabled:opacity-50">Tomorrow 8am</button>
					<button onclick={() => createReminder('snooze', { remindAt: getNextMondayAt8() })} disabled={creating} class="rounded px-2 py-1.5 text-left text-xs text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700 disabled:opacity-50">Next Monday</button>
					<button onclick={() => (showCustomSnooze = true)} class="col-span-2 rounded px-2 py-1.5 text-left text-xs text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-700">Custom...</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
