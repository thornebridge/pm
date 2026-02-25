<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import TemplatePicker from './TemplatePicker.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		contacts: Array<{ id: string; firstName: string; lastName: string; email: string }>;
		replyTo?: { messageId: string; threadId: string; subject: string; toEmail: string };
		prefilledTo?: string;
		onsent?: () => void;
	}

	let { open, onclose, contacts, replyTo, prefilledTo, onsent }: Props = $props();

	let to = $state('');
	let cc = $state('');
	let subject = $state('');
	let body = $state('');
	let sending = $state(false);
	let showCc = $state(false);
	let showSuggestions = $state(false);
	let toSuggestions = $state<typeof contacts>([]);
	let showTemplatePicker = $state(false);
	let selectedContactId = $state<string | null>(null);
	let trackOpens = $state(true);

	$effect(() => {
		if (open) {
			if (replyTo) {
				to = replyTo.toEmail;
				subject = replyTo.subject;
				body = '';
				trackOpens = false;
			} else if (prefilledTo) {
				to = prefilledTo;
				subject = '';
				body = '';
				trackOpens = true;
			} else {
				to = '';
				subject = '';
				body = '';
				trackOpens = true;
			}
			cc = '';
			showCc = false;
			selectedContactId = null;
			showTemplatePicker = false;
		}
	});

	function onToInput() {
		const value = to.trim().toLowerCase();
		if (value.length < 2) {
			toSuggestions = [];
			showSuggestions = false;
			return;
		}
		toSuggestions = contacts.filter(
			(c) =>
				c.email?.toLowerCase().includes(value) ||
				`${c.firstName} ${c.lastName}`.toLowerCase().includes(value)
		).slice(0, 5);
		showSuggestions = toSuggestions.length > 0;
	}

	function selectSuggestion(contact: typeof contacts[0]) {
		to = contact.email;
		selectedContactId = contact.id;
		showSuggestions = false;
	}

	async function handleTemplateSelect(template: { id: string; name: string; subjectTemplate: string; bodyTemplate: string }) {
		if (selectedContactId) {
			try {
				const preview = await api<{ subject: string; bodyHtml: string }>(
					`/api/crm/gmail/templates/${template.id}/preview`,
					{ method: 'POST', body: JSON.stringify({ contactId: selectedContactId }) }
				);
				subject = preview.subject;
				// Convert HTML back to plain text for the textarea
				body = preview.bodyHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
			} catch {
				// Fallback to raw template
				subject = template.subjectTemplate;
				body = template.bodyTemplate;
			}
		} else {
			subject = template.subjectTemplate;
			body = template.bodyTemplate;
		}
	}

	async function send() {
		if (!to.trim() || !subject.trim() || !body.trim()) {
			showToast('Fill in all required fields', 'error');
			return;
		}

		sending = true;
		try {
			const payload: Record<string, unknown> = {
				to: to.split(',').map((e) => e.trim()).filter(Boolean),
				subject,
				html: body.replace(/\n/g, '<br>')
			};
			if (cc.trim()) {
				payload.cc = cc.split(',').map((e) => e.trim()).filter(Boolean);
			}
			payload.trackOpens = trackOpens;
			if (replyTo) {
				payload.replyToMessageId = replyTo.messageId;
				payload.threadId = replyTo.threadId;
			}

			await api('/api/crm/gmail/send', {
				method: 'POST',
				body: JSON.stringify(payload)
			});

			showToast('Email sent');
			onsent?.();
			onclose();
		} catch {
			showToast('Failed to send email', 'error');
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			send();
		}
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
		onkeydown={handleKeydown}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="absolute inset-0 bg-black/40 dark:bg-black/60" role="presentation" transition:fade={{ duration: 150 }} onclick={onclose}></div>
		<div
			class="relative w-full max-w-lg rounded-t-lg bg-surface-50 shadow-xl dark:bg-surface-900 sm:rounded-lg"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<div class="relative flex items-center justify-between border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{replyTo ? 'Reply' : 'New Email'}
				</h3>
				<div class="flex items-center gap-2">
					{#if !replyTo}
						<button
							onclick={() => (showTemplatePicker = !showTemplatePicker)}
							class="rounded-md border border-surface-300 px-2 py-1 text-[10px] font-medium text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700"
						>
							Templates
						</button>
					{/if}
					<button onclick={onclose} class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">&times;</button>
				</div>
				<TemplatePicker
					open={showTemplatePicker}
					onselect={handleTemplateSelect}
					onclose={() => (showTemplatePicker = false)}
				/>
			</div>

			<!-- Form -->
			<div class="space-y-3 px-4 py-3">
				<!-- To -->
				<div class="relative">
					<div class="flex items-center gap-2">
						<label class="w-8 text-xs text-surface-500">To
						<input
							bind:value={to}
							oninput={onToInput}
							onfocus={() => onToInput()}
							onblur={() => setTimeout(() => (showSuggestions = false), 200)}
							placeholder="email@example.com"
							class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</label>
						{#if !showCc}
							<button onclick={() => (showCc = true)} class="text-xs text-surface-500 hover:text-surface-700">Cc</button>
						{/if}
					</div>
					{#if showSuggestions}
						<div class="absolute left-8 top-full z-10 mt-1 w-[calc(100%-2rem)] rounded-md border border-surface-300 bg-surface-50 shadow-lg dark:border-surface-700 dark:bg-surface-800">
							{#each toSuggestions as contact}
								<button
									onclick={() => selectSuggestion(contact)}
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700"
								>
									<span class="text-surface-900 dark:text-surface-100">{contact.firstName} {contact.lastName}</span>
									<span class="text-xs text-surface-500">{contact.email}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- CC -->
				{#if showCc}
					<div class="flex items-center gap-2">
						<label class="w-8 text-xs text-surface-500">Cc
						<input
							bind:value={cc}
							placeholder="cc@example.com"
							class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</label>
					</div>
				{/if}

				<!-- Subject -->
				<div class="flex items-center gap-2">
					<label class="w-8 text-xs text-surface-500">Subj
						<input
							bind:value={subject}
							placeholder="Subject"
							class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</label>
				</div>

				<!-- Body -->
				<textarea
					bind:value={body}
					placeholder="Write your message..."
					rows="8"
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				></textarea>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-surface-300 px-4 py-3 dark:border-surface-800">
				<div class="flex items-center gap-3">
					<span class="text-[10px] text-surface-500">Ctrl+Enter to send</span>
					<label class="flex items-center gap-1 text-[10px] text-surface-500">
						<input type="checkbox" bind:checked={trackOpens} class="h-3 w-3 rounded border-surface-400" />
						Track opens
					</label>
				</div>
				<div class="flex gap-2">
					<button onclick={onclose} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">
						Cancel
					</button>
					<button
						onclick={send}
						disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
						class="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
					>
						{sending ? 'Sending...' : 'Send'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
