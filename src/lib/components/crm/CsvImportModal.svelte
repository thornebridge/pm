<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		statuses: Array<{ id: string; name: string }>;
	}

	let { open, onclose, statuses }: Props = $props();

	type Step = 'upload' | 'mapping' | 'import';

	let step = $state<Step>('upload');
	let file = $state<File | null>(null);
	let csvHeaders = $state<string[]>([]);
	let csvPreview = $state<string[][]>([]);
	let totalRows = $state(0);
	let mapping = $state<Record<string, string>>({});
	let skipDuplicates = $state(true);
	let importing = $state(false);
	let result = $state<{ imported: number; skipped: number; errors: Array<{ row: number; error: string }>; total: number } | null>(null);

	const leadFields = [
		{ key: '', label: 'Skip' },
		{ key: 'firstName', label: 'First Name' },
		{ key: 'lastName', label: 'Last Name' },
		{ key: 'email', label: 'Email' },
		{ key: 'phone', label: 'Phone' },
		{ key: 'title', label: 'Job Title' },
		{ key: 'companyName', label: 'Company Name' },
		{ key: 'website', label: 'Website' },
		{ key: 'industry', label: 'Industry' },
		{ key: 'companySize', label: 'Company Size' },
		{ key: 'address', label: 'Address' },
		{ key: 'notes', label: 'Notes' }
	];

	const autoMap: Record<string, string> = {
		'first name': 'firstName', 'first_name': 'firstName', 'firstname': 'firstName',
		'last name': 'lastName', 'last_name': 'lastName', 'lastname': 'lastName',
		'email': 'email', 'email address': 'email', 'e-mail': 'email',
		'phone': 'phone', 'phone number': 'phone', 'telephone': 'phone',
		'title': 'title', 'job title': 'title', 'position': 'title',
		'company': 'companyName', 'company name': 'companyName', 'organization': 'companyName',
		'website': 'website', 'url': 'website', 'web': 'website',
		'industry': 'industry',
		'size': 'companySize', 'company size': 'companySize', 'employees': 'companySize',
		'address': 'address',
		'notes': 'notes', 'note': 'notes', 'comments': 'notes'
	};

	$effect(() => {
		if (open) {
			step = 'upload';
			file = null;
			csvHeaders = [];
			csvPreview = [];
			totalRows = 0;
			mapping = {};
			skipDuplicates = true;
			importing = false;
			result = null;
		}
	});

	function parseCsvLine(line: string): string[] {
		const fields: string[] = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (inQuotes) {
				if (ch === '"' && line[i + 1] === '"') {
					current += '"';
					i++;
				} else if (ch === '"') {
					inQuotes = false;
				} else {
					current += ch;
				}
			} else {
				if (ch === '"') {
					inQuotes = true;
				} else if (ch === ',') {
					fields.push(current.trim());
					current = '';
				} else {
					current += ch;
				}
			}
		}
		fields.push(current.trim());
		return fields;
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const f = input.files?.[0];
		if (!f) return;
		file = f;

		const text = await f.text();
		const lines = text.split(/\r?\n/).filter((l) => l.trim());
		if (lines.length < 2) {
			showToast('CSV must have a header row and at least one data row', 'error');
			file = null;
			return;
		}

		csvHeaders = parseCsvLine(lines[0]);
		csvPreview = lines.slice(1, 6).map(parseCsvLine);
		totalRows = lines.length - 1;

		// Auto-map columns
		const newMapping: Record<string, string> = {};
		for (const h of csvHeaders) {
			const key = h.toLowerCase().trim();
			if (autoMap[key]) {
				newMapping[h] = autoMap[key];
			} else {
				newMapping[h] = '';
			}
		}
		mapping = newMapping;
		step = 'mapping';
	}

	async function doImport() {
		if (!file) return;
		importing = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('mapping', JSON.stringify(mapping));
			formData.append('skipDuplicates', String(skipDuplicates));
			formData.append('defaultStatusId', statuses[0]?.id || '');

			const res = await fetch('/api/crm/leads/import', {
				method: 'POST',
				body: formData
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Import failed');
			}
			result = await res.json();
			step = 'import';
			showToast(`Imported ${result!.imported} leads`);
			await invalidateAll();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Import failed', 'error');
		} finally {
			importing = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[8vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-2xl rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Import Leads from CSV</h2>
				<div class="mt-1 flex gap-4 text-xs text-surface-500">
					<span class={step === 'upload' ? 'font-medium text-brand-500' : ''}>1. Upload</span>
					<span class={step === 'mapping' ? 'font-medium text-brand-500' : ''}>2. Map Columns</span>
					<span class={step === 'import' ? 'font-medium text-brand-500' : ''}>3. Results</span>
				</div>
			</div>

			<div class="p-4">
				{#if step === 'upload'}
					<div class="flex flex-col items-center gap-4 py-8">
						<svg class="h-12 w-12 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
						<p class="text-sm text-surface-600 dark:text-surface-400">Upload a CSV file with your leads</p>
						<label class="cursor-pointer rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
							Choose File
							<input type="file" accept=".csv" onchange={handleFileSelect} class="hidden" />
						</label>
					</div>
				{:else if step === 'mapping'}
					<div class="space-y-4">
						<p class="text-sm text-surface-600 dark:text-surface-400">
							{totalRows} row{totalRows !== 1 ? 's' : ''} found. Map CSV columns to lead fields:
						</p>
						<div class="max-h-[50vh] overflow-y-auto space-y-2">
							{#each csvHeaders as header}
								<div class="flex items-center gap-3">
									<span class="w-40 shrink-0 truncate text-sm font-medium text-surface-700 dark:text-surface-300" title={header}>{header}</span>
									<svg class="h-4 w-4 shrink-0 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
									<select
										bind:value={mapping[header]}
										class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
									>
										{#each leadFields as f}
											<option value={f.key}>{f.label}</option>
										{/each}
									</select>
								</div>
							{/each}
						</div>

						{#if csvPreview.length > 0}
							<div class="mt-3">
								<p class="mb-1 text-xs font-medium text-surface-500">Preview (first {csvPreview.length} rows)</p>
								<div class="overflow-x-auto rounded border border-surface-200 dark:border-surface-800">
									<table class="w-full text-xs">
										<thead>
											<tr class="bg-surface-100 dark:bg-surface-800">
												{#each csvHeaders as h}
													<th class="px-2 py-1 text-left font-medium text-surface-600 dark:text-surface-400">{h}</th>
												{/each}
											</tr>
										</thead>
										<tbody>
											{#each csvPreview as row}
												<tr class="border-t border-surface-200 dark:border-surface-800">
													{#each row as cell}
														<td class="px-2 py-1 text-surface-700 dark:text-surface-300">{cell}</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}

						<div class="flex items-center gap-2 pt-2">
							<input id="skip-dupes" type="checkbox" bind:checked={skipDuplicates} class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
							<label for="skip-dupes" class="text-sm text-surface-700 dark:text-surface-300">Skip duplicates (by email)</label>
						</div>
					</div>
				{:else if step === 'import' && result}
					<div class="space-y-4 py-4">
						<div class="grid grid-cols-3 gap-4 text-center">
							<div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
								<p class="text-2xl font-bold text-green-700 dark:text-green-400">{result.imported}</p>
								<p class="text-xs text-green-600 dark:text-green-500">Imported</p>
							</div>
							<div class="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
								<p class="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{result.skipped}</p>
								<p class="text-xs text-yellow-600 dark:text-yellow-500">Skipped</p>
							</div>
							<div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
								<p class="text-2xl font-bold text-red-700 dark:text-red-400">{result.errors.length}</p>
								<p class="text-xs text-red-600 dark:text-red-500">Errors</p>
							</div>
						</div>
						{#if result.errors.length > 0}
							<div class="max-h-40 overflow-y-auto rounded border border-red-200 p-2 dark:border-red-800">
								{#each result.errors.slice(0, 20) as err}
									<p class="text-xs text-red-600 dark:text-red-400">Row {err.row}: {err.error}</p>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-2 border-t border-surface-300 px-4 py-3 dark:border-surface-800">
				{#if step === 'mapping'}
					<button type="button" onclick={() => (step = 'upload')} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Back</button>
				{/if}
				<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">
					{step === 'import' ? 'Close' : 'Cancel'}
				</button>
				{#if step === 'mapping'}
					<button
						onclick={doImport}
						disabled={importing}
						class="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>
						{importing ? 'Importing...' : `Import ${totalRows} Leads`}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
