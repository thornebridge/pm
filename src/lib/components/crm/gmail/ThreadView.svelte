<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import ComposeEmail from './ComposeEmail.svelte';

	interface Props {
		thread: {
			id: string;
			subject: string;
			isRead: boolean;
			isStarred: boolean;
			category: string;
		};
		messages: Array<{
			id: string;
			fromEmail: string;
			fromName: string | null;
			toEmails: string;
			ccEmails: string | null;
			subject: string;
			bodyHtml: string | null;
			bodyText: string | null;
			snippet: string | null;
			internalDate: number;
			isRead: boolean;
			hasAttachments: boolean;
			attachments: Array<{
				gmailAttachmentId: string;
				filename: string;
				mimeType: string;
				size: number;
			}>;
		}>;
		linkedEntities: Array<{
			linkId: string;
			type: string;
			id: string;
			name: string;
			linkType: string;
		}>;
		contacts: Array<{ id: string; firstName: string; lastName: string; email: string }>;
		onback: () => void;
		onrefresh: () => void;
	}

	let { thread, messages, linkedEntities, contacts, onback, onrefresh }: Props = $props();

	let showReply = $state(false);
	let replyTo = $state<{ messageId: string; threadId: string; subject: string; toEmail: string } | undefined>(undefined);
	let creatingTask = $state(false);

	function formatDate(ms: number): string {
		return new Date(ms).toLocaleString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function parseEmails(json: string): string[] {
		try { return JSON.parse(json); } catch { return []; }
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function startReply(msg: typeof messages[0]) {
		replyTo = {
			messageId: msg.id,
			threadId: thread.id,
			subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
			toEmail: msg.fromEmail
		};
		showReply = true;
	}

	async function toggleStar() {
		try {
			await api(`/api/crm/gmail/threads/${thread.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isStarred: !thread.isStarred })
			});
			thread.isStarred = !thread.isStarred;
		} catch {
			showToast('Failed to update', 'error');
		}
	}

	async function archiveThread() {
		try {
			await api(`/api/crm/gmail/threads/${thread.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ archive: true })
			});
			showToast('Thread archived');
			onback();
			onrefresh();
		} catch {
			showToast('Failed to archive', 'error');
		}
	}

	async function createTask() {
		creatingTask = true;
		try {
			await api(`/api/crm/gmail/threads/${thread.id}/create-task`, {
				method: 'POST',
				body: JSON.stringify({
					title: `Follow up: ${thread.subject}`
				})
			});
			showToast('Task created');
		} catch {
			showToast('Failed to create task', 'error');
		} finally {
			creatingTask = false;
		}
	}

	async function removeLink(linkId: string) {
		try {
			await api(`/api/crm/gmail/threads/${thread.id}/link`, {
				method: 'DELETE',
				body: JSON.stringify({ linkId })
			});
			linkedEntities = linkedEntities.filter((e) => e.linkId !== linkId);
			showToast('Link removed');
		} catch {
			showToast('Failed to remove link', 'error');
		}
	}

	// Convert plain text email to presentable HTML
	function plainTextToHtml(text: string): string {
		// Escape HTML entities
		let escaped = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Convert URLs to clickable links with truncated display text
		escaped = escaped.replace(
			/(?:&lt;)?(https?:\/\/[^\s&<>")\]]+)(?:&gt;)?/g,
			(_match, url: string) => {
				let display = url;
				try {
					const u = new URL(url);
					display = u.hostname + (u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname);
				} catch { /* keep full url as display */ }
				return `<a href="${url}" target="_blank" rel="noopener noreferrer">${display}</a>`;
			}
		);

		// Convert email addresses to mailto links
		escaped = escaped.replace(
			/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
			'<a href="mailto:$1">$1</a>'
		);

		// Handle quoted lines (lines starting with >)
		const lines = escaped.split('\n');
		const result: string[] = [];
		let inQuote = false;

		for (const line of lines) {
			const isQuotedLine = /^(&gt;\s*)+/.test(line);
			if (isQuotedLine && !inQuote) {
				result.push('<blockquote class="email-quote">');
				inQuote = true;
			} else if (!isQuotedLine && inQuote) {
				result.push('</blockquote>');
				inQuote = false;
			}

			if (isQuotedLine) {
				result.push(line.replace(/^(&gt;\s*)+/, '') + '<br>');
			} else if (line.trim() === '') {
				result.push('<br>');
			} else {
				result.push(line + '<br>');
			}
		}
		if (inQuote) result.push('</blockquote>');

		return result.join('\n');
	}

	let sanitizedBodies = $state<Map<string, string>>(new Map());

	onMount(async () => {
		const DOMPurify = (await import('dompurify')).default;
		const map = new Map<string, string>();
		for (const msg of messages) {
			if (msg.bodyHtml) {
				map.set(msg.id, DOMPurify.sanitize(msg.bodyHtml, {
					ALLOWED_TAGS: ['a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'div', 'span', 'ul', 'ol', 'li',
						'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'table', 'thead',
						'tbody', 'tr', 'td', 'th', 'img', 'hr', 'caption', 'col', 'colgroup', 'center',
						'abbr', 'address', 'cite', 'dd', 'dl', 'dt', 'figure', 'figcaption', 'small', 'sub', 'sup'],
					ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'width', 'height',
						'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
						'dir', 'title', 'role', 'scope'],
					ADD_ATTR: ['target'],
					FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input']
				}));
			} else if (msg.bodyText) {
				// Convert plain text to rich HTML
				map.set(msg.id, DOMPurify.sanitize(plainTextToHtml(msg.bodyText), {
					ALLOWED_TAGS: ['a', 'br', 'blockquote', 'div', 'span'],
					ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
				}));
			}
		}
		sanitizedBodies = map;
	});
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex items-center gap-2 border-b border-surface-300 px-4 py-3 dark:border-surface-800">
		<button onclick={onback} aria-label="Go back" class="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 md:hidden">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
			</svg>
		</button>
		<h2 class="flex-1 truncate text-sm font-semibold text-surface-900 dark:text-surface-100">{thread.subject}</h2>
		<div class="flex gap-1">
			<button onclick={toggleStar} title={thread.isStarred ? 'Unstar' : 'Star'} class="rounded p-1.5 {thread.isStarred ? 'text-amber-500' : 'text-surface-400 hover:text-amber-500'}">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
				</svg>
			</button>
			<button onclick={archiveThread} title="Archive" class="rounded p-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zm0 6h12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9zm5 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
				</svg>
			</button>
			<button onclick={createTask} disabled={creatingTask} title="Create task" class="rounded p-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 disabled:opacity-50">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Linked entities -->
	{#if linkedEntities.length > 0}
		<div class="flex flex-wrap gap-1 border-b border-surface-200 px-4 py-2 dark:border-surface-800">
			{#each linkedEntities as entity}
				<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium
					{entity.type === 'contact' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
					{entity.type === 'company' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}
					{entity.type === 'opportunity' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}"
				>
					<a href="/crm/{entity.type === 'opportunity' ? 'opportunities' : entity.type === 'contact' ? 'contacts' : 'companies'}/{entity.id}" class="hover:underline">
						{entity.name}
					</a>
					{#if entity.linkType === 'manual'}
						<button onclick={() => removeLink(entity.linkId)} class="hover:opacity-70">&times;</button>
					{/if}
				</span>
			{/each}
		</div>
	{/if}

	<!-- Messages -->
	<div class="flex-1 space-y-4 overflow-y-auto p-4">
		{#each messages as msg, i (msg.id)}
			<div class="rounded-lg border border-surface-200 dark:border-surface-800">
				<!-- Message header -->
				<div class="flex items-start justify-between border-b border-surface-200 px-4 py-2 dark:border-surface-800">
					<div>
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">
							{msg.fromName || msg.fromEmail}
						</p>
						<div class="mt-0.5 text-[10px] text-surface-500">
							To: {parseEmails(msg.toEmails).join(', ')}
							{#if msg.ccEmails}
								<br>Cc: {parseEmails(msg.ccEmails).join(', ')}
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-[10px] text-surface-500">{formatDate(msg.internalDate)}</span>
						<button
							onclick={() => startReply(msg)}
							title="Reply"
							class="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Message body -->
				<div class="px-4 py-3">
					{#if sanitizedBodies.get(msg.id)}
						<div class="email-body prose prose-sm max-w-none break-words dark:prose-invert {!msg.bodyHtml ? 'email-body-plaintext' : ''}">
							{@html sanitizedBodies.get(msg.id)}
						</div>
					{:else}
						<p class="text-sm text-surface-500 italic">{msg.snippet || '(No content)'}</p>
					{/if}
				</div>

				<!-- Attachments -->
				{#if msg.attachments.length > 0}
					<div class="border-t border-surface-200 px-4 py-2 dark:border-surface-800">
						<div class="flex flex-wrap gap-2">
							{#each msg.attachments as att}
								<a
									href="/api/crm/gmail/attachments/{msg.id}/{att.gmailAttachmentId}"
									class="inline-flex items-center gap-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
									</svg>
									{att.filename}
									<span class="text-surface-500">({formatSize(att.size)})</span>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Quick reply bar -->
	<div class="border-t border-surface-300 px-4 py-2 dark:border-surface-800">
		<button
			onclick={() => {
				const lastMsg = messages[messages.length - 1];
				if (lastMsg) startReply(lastMsg);
			}}
			class="w-full rounded-md border border-surface-300 px-3 py-2 text-left text-sm text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
		>
			Click to reply...
		</button>
	</div>
</div>

<ComposeEmail
	open={showReply}
	onclose={() => { showReply = false; }}
	{contacts}
	{replyTo}
	onsent={() => { showReply = false; }}
/>

<style>
	/* Base email body */
	:global(.email-body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		line-height: 1.6;
		color: var(--color-surface-800);
		word-break: break-word;
		overflow-wrap: break-word;
	}

	:global(.dark .email-body) {
		color: var(--color-surface-200);
	}

	/* Images */
	:global(.email-body img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
	}

	/* Links */
	:global(.email-body a) {
		color: var(--color-brand-500);
		text-decoration: none;
		word-break: break-all;
	}

	:global(.email-body a:hover) {
		text-decoration: underline;
	}

	/* Blockquotes / quoted text */
	:global(.email-body blockquote) {
		border-left: 3px solid var(--color-surface-300);
		padding-left: 12px;
		margin: 8px 0;
		margin-left: 0;
		color: var(--color-surface-500);
	}

	:global(.dark .email-body blockquote) {
		border-left-color: var(--color-surface-600);
		color: var(--color-surface-400);
	}

	:global(.email-body .email-quote) {
		border-left: 3px solid var(--color-surface-300);
		padding-left: 12px;
		margin: 8px 0;
		color: var(--color-surface-500);
	}

	:global(.dark .email-body .email-quote) {
		border-left-color: var(--color-surface-600);
		color: var(--color-surface-400);
	}

	/* Tables */
	:global(.email-body table) {
		border-collapse: collapse;
		max-width: 100%;
		overflow-x: auto;
		display: block;
	}

	:global(.email-body td),
	:global(.email-body th) {
		padding: 6px 10px;
		vertical-align: top;
	}

	:global(.email-body th) {
		font-weight: 600;
	}

	/* Headings */
	:global(.email-body h1) { font-size: 1.4em; margin: 16px 0 8px; font-weight: 600; }
	:global(.email-body h2) { font-size: 1.2em; margin: 14px 0 6px; font-weight: 600; }
	:global(.email-body h3) { font-size: 1.1em; margin: 12px 0 4px; font-weight: 600; }

	/* Paragraphs */
	:global(.email-body p) {
		margin: 0 0 8px;
	}

	/* Lists */
	:global(.email-body ul),
	:global(.email-body ol) {
		padding-left: 24px;
		margin: 4px 0 8px;
	}

	:global(.email-body li) {
		margin-bottom: 2px;
	}

	/* Code */
	:global(.email-body pre) {
		background: var(--color-surface-100);
		border-radius: 6px;
		padding: 12px;
		overflow-x: auto;
		font-size: 0.85em;
	}

	:global(.dark .email-body pre) {
		background: var(--color-surface-800);
	}

	:global(.email-body code) {
		background: var(--color-surface-100);
		border-radius: 3px;
		padding: 1px 4px;
		font-size: 0.9em;
	}

	:global(.dark .email-body code) {
		background: var(--color-surface-800);
	}

	/* HR */
	:global(.email-body hr) {
		border: none;
		border-top: 1px solid var(--color-surface-200);
		margin: 16px 0;
	}

	:global(.dark .email-body hr) {
		border-top-color: var(--color-surface-700);
	}

	/* Plain text specific styles */
	:global(.email-body-plaintext) {
		font-size: 0.875rem;
		line-height: 1.7;
	}

	:global(.email-body-plaintext a) {
		word-break: break-all;
	}
</style>
