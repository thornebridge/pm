<script lang="ts">
	import { formatPhoneNumber } from '$lib/utils/phone.js';

	interface QueueItem {
		id: string;
		contactId: string;
		position: number;
		status: string;
		disposition: string | null;
		contactFirstName: string;
		contactLastName: string;
		contactPhone: string | null;
		contactTitle: string | null;
		companyName: string | null;
	}

	interface Props {
		items: QueueItem[];
		currentItemId?: string | null;
		onremove: (itemId: string) => void;
		onmoveup: (itemId: string) => void;
		onmovedown: (itemId: string) => void;
	}

	let { items, currentItemId = null, onremove, onmoveup, onmovedown }: Props = $props();

	const statusBadge: Record<string, string> = {
		pending: '',
		calling: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
		completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		skipped: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-500'
	};

	const dispositionShort: Record<string, string> = {
		connected_interested: 'Interested',
		connected_not_interested: 'Not Interested',
		connected_callback: 'Callback',
		connected_left_voicemail: 'Left VM',
		connected_wrong_number: 'Wrong #',
		connected_do_not_call: 'DNC',
		no_answer: 'No Answer',
		busy: 'Busy',
		voicemail_left_message: 'VM Left',
		voicemail_no_message: 'VM No Msg'
	};
</script>

<div class="rounded-lg border border-surface-200 dark:border-surface-700">
	<div class="border-b border-surface-200 bg-surface-50 px-4 py-2.5 dark:border-surface-700 dark:bg-surface-800/50">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
				Queue
				<span class="ml-1 text-xs font-normal text-surface-500">({items.length} contacts)</span>
			</h3>
		</div>
	</div>

	{#if items.length === 0}
		<div class="p-6 text-center text-sm text-surface-500 dark:text-surface-400">
			No contacts in queue. Search and add contacts to get started.
		</div>
	{:else}
		<div class="max-h-[calc(100vh-320px)] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800">
			{#each items as item, i (item.id)}
				{@const isCurrent = item.id === currentItemId}
				<div
					class="flex items-center gap-3 px-3 py-2.5 transition-colors {isCurrent ? 'bg-brand-50 dark:bg-brand-900/10' : ''} {item.status === 'completed' || item.status === 'skipped' ? 'opacity-50' : ''}"
				>
					<!-- Position number -->
					<span class="w-5 shrink-0 text-center text-xs font-medium text-surface-400">{i + 1}</span>

					<!-- Contact info -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
								{item.contactFirstName} {item.contactLastName}
							</span>
							{#if item.status !== 'pending'}
								<span class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium {statusBadge[item.status] || ''}">
									{#if item.disposition}
										{dispositionShort[item.disposition] || item.status}
									{:else}
										{item.status}
									{/if}
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-2 text-xs text-surface-500">
							{#if item.companyName}
								<span>{item.companyName}</span>
							{/if}
							{#if item.contactPhone}
								<span>{formatPhoneNumber(item.contactPhone)}</span>
							{/if}
						</div>
					</div>

					<!-- Actions (only for pending items) -->
					{#if item.status === 'pending'}
						<div class="flex shrink-0 items-center gap-0.5">
							<button
								onclick={() => onmoveup(item.id)}
								disabled={i === 0}
								class="rounded p-1 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 disabled:opacity-30 dark:hover:bg-surface-800 dark:hover:text-surface-300"
								title="Move up"
							>
								<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
								</svg>
							</button>
							<button
								onclick={() => onmovedown(item.id)}
								disabled={i === items.length - 1}
								class="rounded p-1 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 disabled:opacity-30 dark:hover:bg-surface-800 dark:hover:text-surface-300"
								title="Move down"
							>
								<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
							<button
								onclick={() => onremove(item.id)}
								class="rounded p-1 text-surface-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
								title="Remove"
							>
								<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
