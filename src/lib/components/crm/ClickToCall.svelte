<script lang="ts">
	import { formatPhoneNumber } from '$lib/utils/phone.js';
	import { makeCall } from '$lib/stores/dialer.svelte.js';

	interface Props {
		phone: string;
		contactId?: string;
		companyId?: string;
		contactName?: string;
		telnyxEnabled: boolean;
	}
	let { phone, contactId, companyId, contactName, telnyxEnabled }: Props = $props();
</script>

{#if telnyxEnabled && phone}
	<button
		onclick={() => makeCall(phone, { contactId, companyId, contactName })}
		class="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400 transition-colors"
		title="Call {formatPhoneNumber(phone)}"
	>
		<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
			<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
		</svg>
		{formatPhoneNumber(phone)}
	</button>
{:else}
	<span class="text-sm text-surface-900 dark:text-surface-100">{phone ? formatPhoneNumber(phone) : '\u2014'}</span>
{/if}
