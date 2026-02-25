<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	interface TemplateLine {
		accountId: string;
		debit: string;
		credit: string;
		memo: string;
	}

	let name = $state(data.rule.name);
	let description = $state(data.rule.description || '');
	let frequency = $state(data.rule.frequency);
	let startDate = $state(new Date(data.rule.startDate).toISOString().split('T')[0]);
	let endDate = $state(data.rule.endDate ? new Date(data.rule.endDate).toISOString().split('T')[0] : '');
	let autoPost = $state(data.rule.autoPost);
	let templateDescription = $state(data.rule.templateDescription);

	const parsedLines = JSON.parse(data.rule.templateLines) as Array<{
		accountId: string;
		debit: number;
		credit: number;
		memo?: string;
	}>;

	let lines = $state<TemplateLine[]>(
		parsedLines.map((l) => ({
			accountId: l.accountId,
			debit: l.debit > 0 ? (l.debit / 100).toFixed(2) : '',
			credit: l.credit > 0 ? (l.credit / 100).toFixed(2) : '',
			memo: l.memo || ''
		}))
	);

	let saving = $state(false);

	function addLine() {
		lines = [...lines, { accountId: '', debit: '', credit: '', memo: '' }];
	}

	function removeLine(index: number) {
		if (lines.length <= 2) return;
		lines = lines.filter((_, i) => i !== index);
	}

	const totalDebits = $derived.by(() => {
		return lines.reduce((sum, l) => {
			const val = parseFloat(l.debit);
			return sum + (isNaN(val) ? 0 : Math.round(val * 100));
		}, 0);
	});

	const totalCredits = $derived.by(() => {
		return lines.reduce((sum, l) => {
			const val = parseFloat(l.credit);
			return sum + (isNaN(val) ? 0 : Math.round(val * 100));
		}, 0);
	});

	const isBalanced = $derived(totalDebits === totalCredits && totalDebits > 0);

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	async function saveRule() {
		if (!name.trim() || !templateDescription.trim()) {
			showToast('Name and template description are required', 'error');
			return;
		}
		if (!isBalanced) {
			showToast('Template lines must balance', 'error');
			return;
		}

		saving = true;
		try {
			const validLines = lines
				.filter((l) => l.accountId)
				.map((l) => ({
					accountId: l.accountId,
					debit: Math.round(parseFloat(l.debit || '0') * 100),
					credit: Math.round(parseFloat(l.credit || '0') * 100),
					memo: l.memo.trim() || null
				}));

			await api(`/api/financials/recurring/${data.rule.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || null,
					frequency,
					endDate: endDate ? new Date(endDate).getTime() : null,
					autoPost,
					templateDescription: templateDescription.trim(),
					templateLines: validLines
				})
			});

			showToast('Rule updated');
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to update rule', 'error');
		} finally {
			saving = false;
		}
	}

	async function generateNow() {
		try {
			await api(`/api/financials/recurring/${data.rule.id}/generate`, {
				method: 'POST'
			});
			showToast('Journal entry generated');
		} catch (err: any) {
			showToast(err.message || 'Failed to generate', 'error');
		}
	}

	async function togglePause() {
		const newStatus = data.rule.status === 'active' ? 'paused' : 'active';
		try {
			await api(`/api/financials/recurring/${data.rule.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status: newStatus })
			});
			showToast(`Rule ${newStatus}`);
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to update status', 'error');
		}
	}

	async function deleteRule() {
		if (!confirm('Are you sure you want to delete this recurring rule?')) return;

		try {
			await api(`/api/financials/recurring/${data.rule.id}`, {
				method: 'DELETE'
			});
			showToast('Rule deleted');
			goto('/financials/recurring');
		} catch (err: any) {
			showToast(err.message || 'Failed to delete rule', 'error');
		}
	}
</script>

<svelte:head>
	<title>{data.rule.name} | Recurring Rules</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6">
		<a href="/financials/recurring" class="text-sm text-surface-500 hover:text-surface-300">&larr; Recurring Rules</a>
		<h1 class="mt-1 text-xl font-semibold text-surface-100">{data.rule.name}</h1>
	</div>

	<!-- Rule Details -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div>
			<label for="rrName" class="mb-1 block text-xs text-surface-500">Name</label>
			<input
				id="rrName"
				type="text"
				bind:value={name}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
			/>
		</div>
		<div>
			<label for="rrFreq" class="mb-1 block text-xs text-surface-500">Frequency</label>
			<select
				id="rrFreq"
				bind:value={frequency}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="biweekly">Bi-weekly</option>
				<option value="monthly">Monthly</option>
				<option value="quarterly">Quarterly</option>
				<option value="yearly">Yearly</option>
			</select>
		</div>
		<div>
			<label for="rrStart" class="mb-1 block text-xs text-surface-500">Start Date</label>
			<input
				id="rrStart"
				type="date"
				bind:value={startDate}
				disabled
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 opacity-60"
			/>
		</div>
		<div>
			<label for="rrEnd" class="mb-1 block text-xs text-surface-500">End Date (optional)</label>
			<input
				id="rrEnd"
				type="date"
				bind:value={endDate}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
			/>
		</div>
		<div class="sm:col-span-2">
			<label for="rrDesc" class="mb-1 block text-xs text-surface-500">Description (optional)</label>
			<input
				id="rrDesc"
				type="text"
				bind:value={description}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
			/>
		</div>
		<div>
			<span class="mb-1 block text-xs text-surface-500">Auto-Post</span>
			<label class="inline-flex items-center gap-2 text-sm text-surface-100">
				<input
					type="checkbox"
					bind:checked={autoPost}
					class="rounded border-surface-700 bg-surface-800"
				/>
				Automatically post generated entries
			</label>
		</div>
	</div>

	<!-- Template Description -->
	<div class="mb-4">
		<label for="rrTemplateDesc" class="mb-1 block text-xs text-surface-500">Template Description</label>
		<input
			id="rrTemplateDesc"
			type="text"
			bind:value={templateDescription}
			placeholder="Description for generated entries"
			class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
		/>
	</div>

	<!-- Template Lines -->
	<div class="mb-4 overflow-x-auto rounded-lg border border-surface-800">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-surface-800 bg-surface-900">
				<tr>
					<th class="px-4 py-2 font-medium text-surface-300">Account</th>
					<th class="w-36 px-4 py-2 font-medium text-surface-300">Debit ($)</th>
					<th class="w-36 px-4 py-2 font-medium text-surface-300">Credit ($)</th>
					<th class="px-4 py-2 font-medium text-surface-300">Line Memo</th>
					<th class="w-12 px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each lines as line, i}
					<tr class="border-b border-surface-800">
						<td class="px-4 py-2">
							<select
								bind:value={line.accountId}
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
							>
								<option value="">Select account...</option>
								{#each data.accounts as account}
									<option value={account.id}>{account.accountNumber} - {account.name}</option>
								{/each}
							</select>
						</td>
						<td class="px-4 py-2">
							<input
								type="number"
								step="0.01"
								min="0"
								bind:value={line.debit}
								placeholder="0.00"
								disabled={parseFloat(line.credit) > 0}
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500 disabled:opacity-40"
							/>
						</td>
						<td class="px-4 py-2">
							<input
								type="number"
								step="0.01"
								min="0"
								bind:value={line.credit}
								placeholder="0.00"
								disabled={parseFloat(line.debit) > 0}
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500 disabled:opacity-40"
							/>
						</td>
						<td class="px-4 py-2">
							<input
								type="text"
								bind:value={line.memo}
								placeholder="Optional"
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
							/>
						</td>
						<td class="px-4 py-2 text-center">
							{#if lines.length > 2}
								<button
									onclick={() => removeLine(i)}
									class="text-xs text-red-500 hover:text-red-400"
									title="Remove line"
								>
									&times;
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot class="border-t border-surface-700 bg-surface-900">
				<tr>
					<td class="px-4 py-2 text-right font-medium text-surface-300">Totals</td>
					<td class="px-4 py-2 font-medium text-surface-100">{fmt(totalDebits)}</td>
					<td class="px-4 py-2 font-medium text-surface-100">{fmt(totalCredits)}</td>
					<td colspan="2" class="px-4 py-2">
						{#if totalDebits !== totalCredits}
							<span class="text-sm font-medium text-red-400">Unbalanced</span>
						{:else if totalDebits > 0}
							<span class="text-sm font-medium text-green-400">Balanced</span>
						{/if}
					</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<div class="mb-6">
		<button
			onclick={addLine}
			class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
		>
			+ Add Line
		</button>
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-wrap gap-3">
		<button
			onclick={saveRule}
			disabled={saving}
			class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save Changes'}
		</button>
		<button
			onclick={generateNow}
			class="rounded-md border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 hover:bg-surface-800"
		>
			Generate Now
		</button>
		<button
			onclick={togglePause}
			class="rounded-md border px-4 py-2 text-sm font-medium {data.rule.status === 'active' ? 'border-yellow-800 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-800 text-green-400 hover:bg-green-900/20'}"
		>
			{data.rule.status === 'active' ? 'Pause' : 'Resume'}
		</button>
		<button
			onclick={deleteRule}
			class="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20"
		>
			Delete
		</button>
	</div>
</div>
