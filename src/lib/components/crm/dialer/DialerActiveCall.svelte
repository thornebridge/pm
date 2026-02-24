<script lang="ts">
	import { formatPhoneNumber, formatCallDuration } from '$lib/utils/phone.js';
	import { getDialerState } from '$lib/stores/dialer.svelte.js';

	interface QueueItem {
		id: string;
		contactFirstName: string;
		contactLastName: string;
		contactEmail: string | null;
		contactPhone: string | null;
		contactTitle: string | null;
		companyName: string | null;
		companyId: string | null;
	}

	interface Props {
		item: QueueItem;
		onskip: () => void;
		onstop: () => void;
	}

	let { item, onskip, onstop }: Props = $props();

	const state = getDialerState();

	const callStateLabel = $derived(
		state.callState === 'connecting' ? 'Connecting...' :
		state.callState === 'ringing' ? 'Ringing...' :
		state.callState === 'active' ? formatCallDuration(state.callDuration) :
		state.callState === 'ending' ? 'Call ended' :
		'Ready'
	);

	const callStateColor = $derived(
		state.callState === 'active' ? 'text-green-600 dark:text-green-400' :
		state.callState === 'ringing' ? 'text-blue-600 dark:text-blue-400' :
		state.callState === 'connecting' ? 'text-yellow-600 dark:text-yellow-400' :
		'text-surface-500'
	);
</script>

<div class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
	<!-- Call state indicator -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if state.callState === 'active'}
				<span class="relative flex h-2.5 w-2.5">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
					<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
				</span>
			{:else if state.callState === 'connecting' || state.callState === 'ringing'}
				<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-500"></span>
			{:else}
				<span class="h-2.5 w-2.5 rounded-full bg-surface-300 dark:bg-surface-600"></span>
			{/if}
			<span class="text-sm font-medium {callStateColor}">{callStateLabel}</span>
		</div>

		<div class="flex gap-2">
			<button
				onclick={onskip}
				class="rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
			>
				Skip
			</button>
			<button
				onclick={onstop}
				class="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
			>
				Stop Session
			</button>
		</div>
	</div>

	<!-- Contact card -->
	<div class="flex items-start gap-4">
		<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
			{item.contactFirstName[0]}{item.contactLastName[0]}
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100">
				{item.contactFirstName} {item.contactLastName}
			</h3>
			{#if item.contactTitle || item.companyName}
				<p class="text-sm text-surface-500">
					{#if item.contactTitle}{item.contactTitle}{/if}
					{#if item.contactTitle && item.companyName} at {/if}
					{#if item.companyName}<span class="font-medium text-surface-700 dark:text-surface-300">{item.companyName}</span>{/if}
				</p>
			{/if}
			<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
				{#if item.contactPhone}
					<span class="flex items-center gap-1">
						<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
						</svg>
						{formatPhoneNumber(item.contactPhone)}
					</span>
				{/if}
				{#if item.contactEmail}
					<span class="flex items-center gap-1">
						<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
							<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
						</svg>
						{item.contactEmail}
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>
