<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let tab = $state<'org' | 'telephony' | 'calendar' | 'email' | 'ai' | 'invites' | 'users' | 'webhooks' | 'backup' | 'audit'>('org');

	// Org settings state
	let orgPlatformName = $state('');
	let orgLoaded = $state(false);
	let savingOrg = $state(false);

	// Telnyx telephony state
	let telnyxEnabled = $state(false);
	let telnyxApiKey = $state('');
	let telnyxConnectionId = $state('');
	let telnyxCredentialId = $state('');
	let telnyxCallerNumbers = $state('');
	let telnyxRecordCalls = $state(false);
	let savingTelnyx = $state(false);
	let testingTelnyx = $state(false);
	let telnyxTestResult = $state<{ valid: boolean; error?: string } | null>(null);
	let showApiKey = $state(false);

	// Google Calendar state
	let googleClientId = $state('');
	let googleClientSecret = $state('');
	let savingCalendar = $state(false);
	let showGoogleSecret = $state(false);

	// Email state
	let emailProvider = $state('');
	let emailFromAddress = $state('');
	let resendApiKey = $state('');
	let savingEmail = $state(false);
	let showResendKey = $state(false);

	// AI state
	let aiEnabled = $state(false);
	let aiProvider = $state('');
	let aiModel = $state('');
	let aiApiKey = $state('');
	let aiEndpoint = $state('');
	let savingAI = $state(false);
	let testingAI = $state(false);
	let aiTestResult = $state<{ valid: boolean; error?: string } | null>(null);
	let showAiKey = $state(false);

	const AI_PROVIDER_DEFAULTS: Record<string, { model: string; endpoint: string }> = {
		openai: { model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
		anthropic: { model: 'claude-sonnet-4-20250514', endpoint: 'https://api.anthropic.com/v1/messages' },
		gemini: { model: 'gemini-2.0-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta' }
	};

	$effect(() => {
		api<{
			platformName: string;
			telnyxEnabled: boolean;
			telnyxApiKey: string | null;
			telnyxConnectionId: string | null;
			telnyxCredentialId: string | null;
			telnyxCallerNumber: string | null;
			telnyxRecordCalls: boolean;
			googleClientId: string | null;
			googleClientSecret: string | null;
			emailProvider: string | null;
			emailFromAddress: string | null;
			resendApiKey: string | null;
			aiEnabled: boolean;
			aiProvider: string | null;
			aiModel: string | null;
			aiApiKey: string | null;
			aiEndpoint: string | null;
		}>('/api/admin/org')
			.then((org) => {
				orgPlatformName = org.platformName;
				telnyxEnabled = org.telnyxEnabled;
				telnyxApiKey = org.telnyxApiKey || '';
				telnyxConnectionId = org.telnyxConnectionId || '';
				telnyxCredentialId = org.telnyxCredentialId || '';
				if (org.telnyxCallerNumber) {
					try {
						const nums = JSON.parse(org.telnyxCallerNumber);
						telnyxCallerNumbers = Array.isArray(nums) ? nums.join('\n') : org.telnyxCallerNumber;
					} catch {
						telnyxCallerNumbers = org.telnyxCallerNumber;
					}
				} else {
					telnyxCallerNumbers = '';
				}
				telnyxRecordCalls = org.telnyxRecordCalls;
				googleClientId = org.googleClientId || '';
				googleClientSecret = org.googleClientSecret || '';
				emailProvider = org.emailProvider || '';
				emailFromAddress = org.emailFromAddress || '';
				resendApiKey = org.resendApiKey || '';
				aiEnabled = org.aiEnabled;
				aiProvider = org.aiProvider || '';
				aiModel = org.aiModel || '';
				aiApiKey = org.aiApiKey || '';
				aiEndpoint = org.aiEndpoint || '';
				orgLoaded = true;
			})
			.catch(() => { orgLoaded = true; });
	});

	async function saveOrgSettings() {
		savingOrg = true;
		try {
			await api('/api/admin/org', {
				method: 'PUT',
				body: JSON.stringify({ platformName: orgPlatformName })
			});
			await invalidateAll();
			showToast('Organization settings saved');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
		} finally {
			savingOrg = false;
		}
	}

	async function saveTelnyxSettings() {
		savingTelnyx = true;
		try {
			const payload: Record<string, unknown> = {
				telnyxEnabled,
				telnyxConnectionId,
				telnyxCredentialId,
				telnyxCallerNumbers,
				telnyxRecordCalls
			};
			// Only send API key if user changed it (not the masked version)
			if (telnyxApiKey && !telnyxApiKey.startsWith('•')) {
				payload.telnyxApiKey = telnyxApiKey;
			}
			await api('/api/admin/org', {
				method: 'PUT',
				body: JSON.stringify(payload)
			});
			await invalidateAll();
			showToast('Telephony settings saved');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
		} finally {
			savingTelnyx = false;
		}
	}

	async function testTelnyxConnection() {
		testingTelnyx = true;
		telnyxTestResult = null;
		try {
			const apiKeyToTest = telnyxApiKey.startsWith('•') ? '' : telnyxApiKey;
			telnyxTestResult = await api<{ valid: boolean; error?: string }>('/api/admin/telnyx-test', {
				method: 'POST',
				body: JSON.stringify({ apiKey: apiKeyToTest, credentialId: telnyxCredentialId })
			});
		} catch {
			telnyxTestResult = { valid: false, error: 'Connection test failed' };
		} finally {
			testingTelnyx = false;
		}
	}

	async function saveCalendarSettings() {
		savingCalendar = true;
		try {
			const payload: Record<string, unknown> = { googleClientId };
			if (googleClientSecret && !googleClientSecret.startsWith('•')) {
				payload.googleClientSecret = googleClientSecret;
			}
			await api('/api/admin/org', { method: 'PUT', body: JSON.stringify(payload) });
			await invalidateAll();
			showToast('Calendar settings saved');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
		} finally {
			savingCalendar = false;
		}
	}

	async function saveEmailSettings() {
		savingEmail = true;
		try {
			const payload: Record<string, unknown> = { emailProvider, emailFromAddress };
			if (resendApiKey && !resendApiKey.startsWith('•')) {
				payload.resendApiKey = resendApiKey;
			}
			await api('/api/admin/org', { method: 'PUT', body: JSON.stringify(payload) });
			await invalidateAll();
			showToast('Email settings saved');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
		} finally {
			savingEmail = false;
		}
	}

	async function saveAISettings() {
		savingAI = true;
		try {
			const payload: Record<string, unknown> = { aiEnabled, aiProvider, aiModel, aiEndpoint };
			if (aiApiKey && !aiApiKey.startsWith('•')) {
				payload.aiApiKey = aiApiKey;
			}
			await api('/api/admin/org', { method: 'PUT', body: JSON.stringify(payload) });
			await invalidateAll();
			showToast('AI settings saved');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
		} finally {
			savingAI = false;
		}
	}

	async function testAIConnection() {
		testingAI = true;
		aiTestResult = null;
		try {
			const keyToTest = aiApiKey.startsWith('•') ? '' : aiApiKey;
			aiTestResult = await api<{ valid: boolean; error?: string }>('/api/admin/ai-test', {
				method: 'POST',
				body: JSON.stringify({ provider: aiProvider, apiKey: keyToTest, model: aiModel, endpoint: aiEndpoint })
			});
		} catch {
			aiTestResult = { valid: false, error: 'Connection test failed' };
		} finally {
			testingAI = false;
		}
	}

	function onAIProviderChange(newProvider: string) {
		aiProvider = newProvider;
		const defaults = AI_PROVIDER_DEFAULTS[newProvider];
		if (defaults) {
			aiModel = defaults.model;
			aiEndpoint = defaults.endpoint;
		}
		aiTestResult = null;
	}

	// Invite state
	let email = $state('');
	let role = $state<'member' | 'admin'>('member');
	let creating = $state(false);

	// Webhook state
	interface Webhook {
		id: string;
		url: string;
		secret: string | null;
		events: string;
		active: boolean;
		createdAt: number;
	}
	let webhooksList = $state<Webhook[]>([]);
	let webhookUrl = $state('');
	let webhookEvents = $state<string[]>(['task.created', 'task.updated', 'task.deleted']);
	let creatingWebhook = $state(false);

	const WEBHOOK_EVENT_OPTIONS = ['task.created', 'task.updated', 'task.deleted', 'comment.created', '*'];

	// Audit log filters
	// svelte-ignore state_referenced_locally
	let auditUser = $state(data.auditFilters?.user ?? '');
	let auditProject = $state(data.auditFilters?.project ?? '');
	let auditAction = $state(data.auditFilters?.action ?? '');

	const ACTION_OPTIONS = ['created', 'status_changed', 'assigned', 'priority_changed', 'commented', 'edited', 'label_added', 'label_removed'];

	onMount(async () => {
		try {
			webhooksList = await api('/api/admin/webhooks');
		} catch {}
	});

	async function createInvite() {
		creating = true;
		try {
			await api('/api/admin/invites', {
				method: 'POST',
				body: JSON.stringify({ email: email || undefined, role })
			});
			email = '';
			await invalidateAll();
			showToast('Invite created');
		} catch {
			showToast('Failed to create invite', 'error');
		} finally {
			creating = false;
		}
	}

	async function deleteInvite(id: string) {
		try {
			await api('/api/admin/invites', {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to delete invite', 'error');
		}
	}

	async function updateUserRole(userId: string, newRole: string) {
		try {
			await api(`/api/admin/users/${userId}`, {
				method: 'PATCH',
				body: JSON.stringify({ role: newRole })
			});
			await invalidateAll();
			showToast('Role updated');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
		}
	}

	async function deleteUser(userId: string, userName: string) {
		if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
		try {
			await api(`/api/admin/users/${userId}`, { method: 'DELETE' });
			await invalidateAll();
			showToast('User deleted');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
		}
	}

	async function createWebhook() {
		if (!webhookUrl.trim() || webhookEvents.length === 0) return;
		creatingWebhook = true;
		try {
			const wh = await api<Webhook>('/api/admin/webhooks', {
				method: 'POST',
				body: JSON.stringify({ url: webhookUrl, events: webhookEvents })
			});
			webhooksList = [...webhooksList, wh];
			webhookUrl = '';
			showToast('Webhook created');
		} catch {
			showToast('Failed to create webhook', 'error');
		} finally {
			creatingWebhook = false;
		}
	}

	async function toggleWebhook(id: string, active: boolean) {
		try {
			await api('/api/admin/webhooks', {
				method: 'PATCH',
				body: JSON.stringify({ id, active: !active })
			});
			webhooksList = webhooksList.map((w) => (w.id === id ? { ...w, active: !active } : w));
		} catch {
			showToast('Failed to update webhook', 'error');
		}
	}

	async function deleteWebhook(id: string) {
		try {
			await api('/api/admin/webhooks', {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			webhooksList = webhooksList.filter((w) => w.id !== id);
		} catch {
			showToast('Failed to delete webhook', 'error');
		}
	}

	function toggleWebhookEvent(event: string) {
		if (webhookEvents.includes(event)) {
			webhookEvents = webhookEvents.filter((e) => e !== event);
		} else {
			webhookEvents = [...webhookEvents, event];
		}
	}

	function applyAuditFilters() {
		const params = new URLSearchParams();
		if (auditUser) params.set('auditUser', auditUser);
		if (auditProject) params.set('auditProject', auditProject);
		if (auditAction) params.set('auditAction', auditAction);
		goto(`/admin?${params.toString()}`, { invalidateAll: true });
	}

	function clearAuditFilters() {
		auditUser = '';
		auditProject = '';
		auditAction = '';
		goto('/admin', { invalidateAll: true });
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatDateTime(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			created: 'created',
			status_changed: 'moved',
			assigned: 'assigned',
			priority_changed: 'reprioritized',
			commented: 'commented on',
			label_added: 'labeled',
			label_removed: 'unlabeled',
			edited: 'edited'
		};
		return labels[action] || action;
	}
</script>

<svelte:head>
	<title>Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<h1 class="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">Admin</h1>

	<!-- Tabs -->
	<div class="mb-6 flex gap-1 overflow-x-auto border-b border-surface-300 dark:border-surface-800">
		{#each [['org', 'Organization'], ['telephony', 'Telephony'], ['calendar', 'Calendar'], ['email', 'Email'], ['ai', 'AI'], ['invites', 'Invites'], ['users', `Users (${data.users.length})`], ['webhooks', 'Webhooks'], ['audit', 'Audit Log'], ['backup', 'Backup']] as [key, label]}
			<button
				onclick={() => (tab = key as typeof tab)}
				class="whitespace-nowrap px-3 py-2 text-sm font-medium transition {tab === key ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'}"
			>
				{label}
			</button>
		{/each}
	</div>

	{#if tab === 'org'}
		{#if orgLoaded}
			<div class="space-y-4">
				<div>
					<label for="platform-name" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Platform Name</label>
					<input
						id="platform-name"
						bind:value={orgPlatformName}
						maxlength={30}
						placeholder="PM"
						class="w-full max-w-xs rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
					<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Displayed in the sidebar and mobile header. Max 30 characters.</p>
				</div>
				<div>
					<button
						onclick={saveOrgSettings}
						disabled={savingOrg}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>
						{savingOrg ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">Loading...</p>
		{/if}

	{:else if tab === 'telephony'}
		{#if orgLoaded}
			<div class="space-y-5">
				<div class="flex items-center gap-3">
					<label class="relative inline-flex cursor-pointer items-center">
						<input type="checkbox" bind:checked={telnyxEnabled} class="peer sr-only" />
						<div class="peer h-5 w-9 rounded-full bg-surface-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-600 peer-checked:after:translate-x-full dark:bg-surface-700"></div>
					</label>
					<span class="text-sm font-medium text-surface-900 dark:text-surface-100">Enable Telnyx Telephony</span>
				</div>

				{#if telnyxEnabled}
					<div>
						<label for="telnyx-api-key" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">API Key</label>
						<div class="relative max-w-md">
							<input
								id="telnyx-api-key"
								type={showApiKey ? 'text' : 'password'}
								bind:value={telnyxApiKey}
								placeholder="KEY..."
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 pr-16 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
							<button
								type="button"
								onclick={() => (showApiKey = !showApiKey)}
								class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
							>{showApiKey ? 'Hide' : 'Show'}</button>
						</div>
						<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Your Telnyx V2 API Key. Found in the Telnyx Portal under Auth.</p>
					</div>

					<div>
						<label for="telnyx-connection-id" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Connection ID</label>
						<input
							id="telnyx-connection-id"
							bind:value={telnyxConnectionId}
							placeholder="e.g. 1234567890"
							class="w-full max-w-md rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
						<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Credential Connection ID from Telnyx SIP Connections.</p>
					</div>

					<div>
						<label for="telnyx-credential-id" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Credential ID</label>
						<input
							id="telnyx-credential-id"
							bind:value={telnyxCredentialId}
							placeholder="e.g. 1234567890"
							class="w-full max-w-md rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
						<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Telephony Credential ID used for WebRTC JWT token generation.</p>
					</div>

					<div>
						<label for="telnyx-callers" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Caller Numbers</label>
						<textarea
							id="telnyx-callers"
							bind:value={telnyxCallerNumbers}
							placeholder="+15551234567&#10;+15559876543"
							rows={4}
							class="w-full max-w-md rounded-md border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						></textarea>
						<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">One number per line in E.164 format (+1XXXXXXXXXX). Calls rotate through these numbers.</p>
					</div>

					<div class="flex items-center gap-3">
						<label class="relative inline-flex cursor-pointer items-center">
							<input type="checkbox" bind:checked={telnyxRecordCalls} class="peer sr-only" />
							<div class="peer h-5 w-9 rounded-full bg-surface-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-600 peer-checked:after:translate-x-full dark:bg-surface-700"></div>
						</label>
						<span class="text-sm text-surface-700 dark:text-surface-300">Record calls</span>
					</div>

					<div class="flex items-center gap-3">
						<button
							onclick={testTelnyxConnection}
							disabled={testingTelnyx || !telnyxCredentialId}
							class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 disabled:opacity-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
						>{testingTelnyx ? 'Testing...' : 'Test Connection'}</button>
						{#if telnyxTestResult}
							{#if telnyxTestResult.valid}
								<span class="text-sm text-green-600 dark:text-green-400">Connected successfully</span>
							{:else}
								<span class="text-sm text-red-500">{telnyxTestResult.error || 'Connection failed'}</span>
							{/if}
						{/if}
					</div>
				{/if}

				<div>
					<button
						onclick={saveTelnyxSettings}
						disabled={savingTelnyx}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>{savingTelnyx ? 'Saving...' : 'Save'}</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">Loading...</p>
		{/if}

	{:else if tab === 'calendar'}
		{#if orgLoaded}
			<div class="space-y-5">
				<p class="text-sm text-surface-600 dark:text-surface-400">
					Connect Google Calendar to enable real-time availability checking and automatic event creation for bookings.
				</p>

				<div>
					<label for="google-client-id" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Client ID</label>
					<input
						id="google-client-id"
						bind:value={googleClientId}
						placeholder="xxxxx.apps.googleusercontent.com"
						class="w-full max-w-md rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
					<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Found in Google Cloud Console → APIs & Services → Credentials.</p>
				</div>

				<div>
					<label for="google-client-secret" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Client Secret</label>
					<div class="relative max-w-md">
						<input
							id="google-client-secret"
							type={showGoogleSecret ? 'text' : 'password'}
							bind:value={googleClientSecret}
							placeholder="GOCSPX-..."
							class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 pr-16 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
						<button
							type="button"
							onclick={() => (showGoogleSecret = !showGoogleSecret)}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
						>{showGoogleSecret ? 'Hide' : 'Show'}</button>
					</div>
					<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Keep this secret. Only update if you're changing credentials.</p>
				</div>

				<div class="rounded-md border border-surface-200 bg-surface-50 px-4 py-3 dark:border-surface-800 dark:bg-surface-800/50">
					<p class="text-xs font-medium text-surface-600 dark:text-surface-400">Redirect URI</p>
					<p class="mt-1 font-mono text-xs text-surface-900 dark:text-surface-100">{window.location.origin}/api/bookings/calendar/callback</p>
					<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Add this as an Authorized redirect URI in your Google OAuth client configuration.</p>
				</div>

				<div>
					<button
						onclick={saveCalendarSettings}
						disabled={savingCalendar}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>{savingCalendar ? 'Saving...' : 'Save'}</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">Loading...</p>
		{/if}

	{:else if tab === 'email'}
		{#if orgLoaded}
			<div class="space-y-5">
				<div>
					<label for="email-provider" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Email Provider</label>
					<select
						id="email-provider"
						bind:value={emailProvider}
						class="w-full max-w-xs rounded-md border border-surface-300 bg-surface-50 px-2 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					>
						<option value="">None</option>
						<option value="resend">Resend</option>
						<option value="sendgrid" disabled>SendGrid (coming soon)</option>
						<option value="mailgun" disabled>Mailgun (coming soon)</option>
					</select>
					<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Used for booking confirmations, notifications, and invites.</p>
				</div>

				{#if emailProvider === 'resend'}
					<div>
						<label for="email-from" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">From Address</label>
						<input
							id="email-from"
							bind:value={emailFromAddress}
							placeholder="PM <notifications@yourdomain.com>"
							class="w-full max-w-md rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
						<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Must be a verified domain in your Resend account.</p>
					</div>

					<div>
						<label for="resend-api-key" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">API Key</label>
						<div class="relative max-w-md">
							<input
								id="resend-api-key"
								type={showResendKey ? 'text' : 'password'}
								bind:value={resendApiKey}
								placeholder="re_..."
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 pr-16 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
							<button
								type="button"
								onclick={() => (showResendKey = !showResendKey)}
								class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
							>{showResendKey ? 'Hide' : 'Show'}</button>
						</div>
						<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Get your API key from resend.com/api-keys.</p>
					</div>
				{:else if emailProvider === 'sendgrid'}
					<div class="rounded-md border border-surface-200 bg-surface-50 px-4 py-6 text-center dark:border-surface-800 dark:bg-surface-800/50">
						<p class="text-sm text-surface-500">SendGrid support coming soon.</p>
					</div>
				{:else if emailProvider === 'mailgun'}
					<div class="rounded-md border border-surface-200 bg-surface-50 px-4 py-6 text-center dark:border-surface-800 dark:bg-surface-800/50">
						<p class="text-sm text-surface-500">Mailgun support coming soon.</p>
					</div>
				{/if}

				<div>
					<button
						onclick={saveEmailSettings}
						disabled={savingEmail}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>{savingEmail ? 'Saving...' : 'Save'}</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">Loading...</p>
		{/if}

	{:else if tab === 'ai'}
		{#if orgLoaded}
			<div class="space-y-4">
				<!-- Enable toggle -->
				<div class="flex items-center gap-3">
					<label class="relative inline-flex cursor-pointer items-center">
						<input type="checkbox" bind:checked={aiEnabled} class="peer sr-only" />
						<div class="peer h-5 w-9 rounded-full bg-surface-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-surface-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-surface-600"></div>
					</label>
					<span class="text-sm font-medium text-surface-700 dark:text-surface-300">Enable AI Features</span>
				</div>

				{#if aiEnabled}
					<!-- Provider -->
					<div>
						<label for="ai-provider" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Provider</label>
						<select
							id="ai-provider"
							value={aiProvider}
							onchange={(e) => onAIProviderChange(e.currentTarget.value)}
							class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						>
							<option value="">Select a provider...</option>
							<option value="openai">OpenAI</option>
							<option value="anthropic">Anthropic</option>
							<option value="gemini">Google Gemini</option>
						</select>
					</div>

					{#if aiProvider}
						<!-- API Key -->
						<div>
							<label for="ai-api-key" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">API Key</label>
							<div class="relative">
								<input
									id="ai-api-key"
									type={showAiKey ? 'text' : 'password'}
									bind:value={aiApiKey}
									placeholder={aiProvider === 'openai' ? 'sk-...' : aiProvider === 'anthropic' ? 'sk-ant-...' : 'AI...'}
									class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 pr-16 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								/>
								<button
									type="button"
									onclick={() => (showAiKey = !showAiKey)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
								>{showAiKey ? 'Hide' : 'Show'}</button>
							</div>
						</div>

						<!-- Model -->
						<div>
							<label for="ai-model" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Model</label>
							<input
								id="ai-model"
								type="text"
								bind:value={aiModel}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
						</div>

						<!-- Endpoint -->
						<div>
							<label for="ai-endpoint" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Endpoint</label>
							<input
								id="ai-endpoint"
								type="text"
								bind:value={aiEndpoint}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
							<p class="mt-1 text-xs text-surface-400 dark:text-surface-600">Leave as default unless using a proxy or custom endpoint.</p>
						</div>

						<!-- Test + Save -->
						<div class="flex items-center gap-3">
							<button
								onclick={testAIConnection}
								disabled={testingAI || !aiApiKey || aiApiKey.startsWith('•')}
								class="rounded-md border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-100 disabled:opacity-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
							>{testingAI ? 'Testing...' : 'Test Connection'}</button>

							{#if aiTestResult}
								<span class="text-sm {aiTestResult.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
									{aiTestResult.valid ? 'Connected successfully' : aiTestResult.error || 'Connection failed'}
								</span>
							{/if}
						</div>
					{/if}
				{/if}

				<div>
					<button
						onclick={saveAISettings}
						disabled={savingAI}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>{savingAI ? 'Saving...' : 'Save'}</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">Loading...</p>
		{/if}

	{:else if tab === 'invites'}
		<form
			onsubmit={(e) => { e.preventDefault(); createInvite(); }}
			class="mb-6 flex items-end gap-2"
		>
			<div class="flex-1">
				<label for="email" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Email (optional)</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="user@example.com"
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<select
				bind:value={role}
				class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
			>
				<option value="member">Member</option>
				<option value="admin">Admin</option>
			</select>
			<button type="submit" disabled={creating} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
				Create invite
			</button>
		</form>
		<div class="space-y-2">
			{#each data.invites as invite}
				<div class="flex items-center justify-between rounded-md border border-surface-300 px-4 py-3 dark:border-surface-800">
					<div>
						<p class="font-mono text-xs text-surface-600 dark:text-surface-400">{invite.token}</p>
						<div class="mt-1 flex gap-3 text-xs text-surface-500">
							{#if invite.email}<span>{invite.email}</span>{/if}
							<span>{invite.role}</span>
							{#if invite.usedAt}
								<span class="text-green-600 dark:text-green-500">Used</span>
							{:else if invite.expiresAt < Date.now()}
								<span class="text-red-500 dark:text-red-400">Expired</span>
							{:else}
								<span>Expires {formatDate(invite.expiresAt)}</span>
							{/if}
						</div>
					</div>
					{#if !invite.usedAt}
						<button onclick={() => deleteInvite(invite.id)} class="text-xs text-surface-500 hover:text-red-500">Delete</button>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-surface-500">No invites yet.</p>
			{/each}
		</div>

	{:else if tab === 'users'}
		<div class="space-y-2">
			{#each data.users as user (user.id)}
				<div class="flex items-center justify-between rounded-md border border-surface-300 px-4 py-3 dark:border-surface-800">
					<div>
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{user.name}</p>
						<p class="text-xs text-surface-500">{user.email}</p>
						<p class="mt-0.5 text-[10px] text-surface-400 dark:text-surface-600">Joined {formatDate(user.createdAt)}</p>
					</div>
					<div class="flex items-center gap-2">
						<select
							value={user.role}
							onchange={(e) => updateUserRole(user.id, e.currentTarget.value)}
							disabled={user.id === data.user?.id}
							class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
						>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
						</select>
						{#if user.id !== data.user?.id}
							<button onclick={() => deleteUser(user.id, user.name)} class="text-xs text-surface-400 hover:text-red-500">Delete</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

	{:else if tab === 'webhooks'}
		<form
			onsubmit={(e) => { e.preventDefault(); createWebhook(); }}
			class="mb-6 space-y-3"
		>
			<div>
				<label for="wh-url" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Webhook URL</label>
				<input
					id="wh-url"
					type="url"
					bind:value={webhookUrl}
					placeholder="https://example.com/webhook"
					required
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div>
				<span class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Events</span>
				<div class="flex flex-wrap gap-2">
					{#each WEBHOOK_EVENT_OPTIONS as event}
						<label class="flex items-center gap-1 text-xs text-surface-700 dark:text-surface-300">
							<input
								type="checkbox"
								checked={webhookEvents.includes(event)}
								onchange={() => toggleWebhookEvent(event)}
								class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
							/>
							{event}
						</label>
					{/each}
				</div>
			</div>
			<button type="submit" disabled={creatingWebhook || !webhookUrl.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
				Create webhook
			</button>
		</form>
		<div class="space-y-2">
			{#each webhooksList as wh (wh.id)}
				<div class="rounded-md border border-surface-300 px-4 py-3 dark:border-surface-800">
					<div class="flex items-center justify-between">
						<p class="text-sm text-surface-900 dark:text-surface-100 {wh.active ? '' : 'opacity-50'}">{wh.url}</p>
						<div class="flex items-center gap-2">
							<button
								onclick={() => toggleWebhook(wh.id, wh.active)}
								class="text-xs {wh.active ? 'text-green-600 dark:text-green-500' : 'text-surface-400'}"
							>{wh.active ? 'Active' : 'Inactive'}</button>
							<button onclick={() => deleteWebhook(wh.id)} class="text-xs text-surface-400 hover:text-red-500">Delete</button>
						</div>
					</div>
					<p class="mt-1 text-[10px] text-surface-500">{JSON.parse(wh.events).join(', ')}</p>
				</div>
			{:else}
				<p class="text-sm text-surface-500">No webhooks configured.</p>
			{/each}
		</div>

	{:else if tab === 'audit'}
		<!-- Filters -->
		<div class="mb-4 flex flex-wrap items-end gap-2">
			<div>
				<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">User
					<select
						bind:value={auditUser}
						class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
					>
						<option value="">All users</option>
						{#each data.users as u}
							<option value={u.id}>{u.name}</option>
						{/each}
					</select>
				</label>
			</div>
			<div>
				<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Project
					<select
						bind:value={auditProject}
						class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
					>
						<option value="">All projects</option>
						{#each data.allProjects as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</label>
			</div>
			<div>
				<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Action
					<select
						bind:value={auditAction}
						class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
					>
						<option value="">All actions</option>
						{#each ACTION_OPTIONS as a}
							<option value={a}>{a}</option>
						{/each}
					</select>
				</label>
			</div>
			<button
				onclick={applyAuditFilters}
				class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500"
			>Filter</button>
			{#if auditUser || auditProject || auditAction}
				<button
					onclick={clearAuditFilters}
					class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
				>Clear</button>
			{/if}
		</div>

		<!-- Audit entries -->
		<div class="space-y-1">
			{#each data.auditLog as entry (entry.id)}
				<div class="rounded-md border border-surface-300 bg-surface-50 px-3 py-2 dark:border-surface-800 dark:bg-surface-900">
					<div class="text-xs text-surface-500">
						<span class="font-medium text-surface-700 dark:text-surface-300">{entry.userName}</span>
						{actionLabel(entry.action)}
						<a href="/projects/{entry.projectSlug}/task/{entry.taskNumber}" class="font-medium text-surface-700 hover:text-brand-600 dark:text-surface-300">
							#{entry.taskNumber} {entry.taskTitle}
						</a>
					</div>
					<div class="mt-0.5 flex items-center gap-3 text-[10px] text-surface-400">
						<span>{entry.projectName}</span>
						<span>{formatDateTime(entry.createdAt)}</span>
						{#if entry.detail}
							<span class="font-mono text-surface-400/70">{entry.detail}</span>
						{/if}
					</div>
				</div>
			{:else}
				<p class="text-sm text-surface-500">No activity recorded yet.</p>
			{/each}
		</div>

		{#if data.auditLog.length >= data.auditLimit}
			<div class="mt-4 text-center">
				<button
					onclick={() => {
						const params = new URLSearchParams();
						if (auditUser) params.set('auditUser', auditUser);
						if (auditProject) params.set('auditProject', auditProject);
						if (auditAction) params.set('auditAction', auditAction);
						params.set('auditOffset', String(data.auditOffset + data.auditLimit));
						goto(`/admin?${params.toString()}`, { invalidateAll: true });
					}}
					class="text-xs text-brand-600 hover:text-brand-500"
				>Load more</button>
			</div>
		{/if}

	{:else if tab === 'backup'}
		<div class="space-y-4">
			<p class="text-sm text-surface-600 dark:text-surface-400">
				Download a full backup of the SQLite database.
			</p>
			<a
				href="/api/admin/backup"
				download
				class="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
			>
				Download backup
			</a>
		</div>
	{/if}
</div>
