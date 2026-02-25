<script lang="ts">
	const MERGE_FIELDS = [
		{ key: '{{firstName}}', label: 'First Name', source: 'Contact' },
		{ key: '{{lastName}}', label: 'Last Name', source: 'Contact' },
		{ key: '{{email}}', label: 'Email', source: 'Contact' },
		{ key: '{{companyName}}', label: 'Company Name', source: 'Contact → Company' },
		{ key: '{{title}}', label: 'Job Title', source: 'Contact' },
		{ key: '{{opportunityTitle}}', label: 'Opportunity Title', source: 'Opportunity' },
		{ key: '{{opportunityValue}}', label: 'Opportunity Value', source: 'Opportunity' }
	] as const;

	interface Template {
		id?: string;
		name: string;
		subjectTemplate: string;
		bodyTemplate: string;
		category: string | null;
	}

	interface Props {
		template?: Template;
		existingCategories?: string[];
		onsave: (data: { name: string; subjectTemplate: string; bodyTemplate: string; category?: string }) => void;
		oncancel: () => void;
	}

	let { template, existingCategories = [], onsave, oncancel }: Props = $props();

	let name = $state(template?.name || '');
	let subjectTemplate = $state(template?.subjectTemplate || '');
	let bodyTemplate = $state(template?.bodyTemplate || '');
	let category = $state(template?.category || '');

	let bodyTextarea: HTMLTextAreaElement | undefined = $state();
	let subjectInput: HTMLInputElement | undefined = $state();
	let activeField = $state<'subject' | 'body'>('body');

	function insertMergeField(fieldKey: string) {
		if (activeField === 'body' && bodyTextarea) {
			const start = bodyTextarea.selectionStart;
			const end = bodyTextarea.selectionEnd;
			bodyTemplate = bodyTemplate.slice(0, start) + fieldKey + bodyTemplate.slice(end);
			// Restore cursor after the inserted field
			requestAnimationFrame(() => {
				if (bodyTextarea) {
					bodyTextarea.selectionStart = bodyTextarea.selectionEnd = start + fieldKey.length;
					bodyTextarea.focus();
				}
			});
		} else if (activeField === 'subject' && subjectInput) {
			const start = subjectInput.selectionStart ?? subjectTemplate.length;
			const end = subjectInput.selectionEnd ?? subjectTemplate.length;
			subjectTemplate = subjectTemplate.slice(0, start) + fieldKey + subjectTemplate.slice(end);
			requestAnimationFrame(() => {
				if (subjectInput) {
					subjectInput.selectionStart = subjectInput.selectionEnd = start + fieldKey.length;
					subjectInput.focus();
				}
			});
		}
	}

	function handleSave() {
		if (!name.trim() || !subjectTemplate.trim() || !bodyTemplate.trim()) return;
		onsave({
			name: name.trim(),
			subjectTemplate: subjectTemplate.trim(),
			bodyTemplate: bodyTemplate.trim(),
			category: category.trim() || undefined
		});
	}
</script>

<div class="space-y-4">
	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<label class="block text-xs font-medium text-surface-700 dark:text-surface-300">Template Name *
			<input
				bind:value={name}
				placeholder="e.g., Cold Intro"
				class="mt-1 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
			</label>
		</div>
		<div>
			<label class="block text-xs font-medium text-surface-700 dark:text-surface-300">Category
			<input
				bind:value={category}
				placeholder="e.g., Outreach, Follow-up"
				list="template-categories"
				class="mt-1 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
			</label>
			<datalist id="template-categories">
				{#each existingCategories as cat}
					<option value={cat}></option>
				{/each}
			</datalist>
		</div>
	</div>

	<div>
		<label class="block text-xs font-medium text-surface-700 dark:text-surface-300">Subject *
		<input
			bind:this={subjectInput}
			bind:value={subjectTemplate}
			onfocus={() => (activeField = 'subject')}
			placeholder={"e.g., Quick intro from {{firstName}}"}
			class="mt-1 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		</label>
	</div>

	<div>
		<label class="block text-xs font-medium text-surface-700 dark:text-surface-300">Body *
		<textarea
			bind:this={bodyTextarea}
			bind:value={bodyTemplate}
			onfocus={() => (activeField = 'body')}
			placeholder={"Hi {{firstName}},\n\nI noticed your work at {{companyName}}..."}
			rows="10"
			class="mt-1 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 font-mono dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		></textarea>
		</label>
	</div>

	<!-- Merge fields reference -->
	<div class="rounded-md border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
		<p class="mb-2 text-xs font-medium text-surface-600 dark:text-surface-400">
			Merge Fields <span class="font-normal">(click to insert into {activeField})</span>
		</p>
		<div class="flex flex-wrap gap-1.5">
			{#each MERGE_FIELDS as field}
				<button
					type="button"
					onclick={() => insertMergeField(field.key)}
					class="inline-flex items-center gap-1 rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 transition hover:border-brand-400 hover:bg-brand-50 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300 dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
					title="{field.label} ({field.source})"
				>
					<span class="font-mono text-[10px] text-brand-600 dark:text-brand-400">{field.key}</span>
					<span class="text-surface-500">{field.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="flex justify-end gap-2 pt-2">
		<button
			onclick={oncancel}
			class="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
		>
			Cancel
		</button>
		<button
			onclick={handleSave}
			disabled={!name.trim() || !subjectTemplate.trim() || !bodyTemplate.trim()}
			class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
		>
			{template?.id ? 'Update Template' : 'Create Template'}
		</button>
	</div>
</div>
