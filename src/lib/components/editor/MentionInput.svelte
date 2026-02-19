<script lang="ts">
	import MentionDropdown from './MentionDropdown.svelte';

	interface User {
		id: string;
		name: string;
	}

	interface Props {
		value: string;
		users: User[];
		placeholder?: string;
		rows?: number;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), users, placeholder = '', rows = 3, onchange }: Props = $props();

	let showDropdown = $state(false);
	let mentionQuery = $state('');
	let dropdownX = $state(0);
	let dropdownY = $state(0);
	let textarea: HTMLTextAreaElement | undefined = $state();
	let containerEl: HTMLDivElement | undefined = $state();

	function handleInput(e: Event) {
		const el = e.target as HTMLTextAreaElement;
		value = el.value;
		onchange?.(value);

		const cursorPos = el.selectionStart;
		const textBefore = el.value.slice(0, cursorPos);
		const atMatch = textBefore.match(/@(\w*)$/);

		if (atMatch) {
			mentionQuery = atMatch[1];
			showDropdown = true;
			// Position dropdown near cursor
			dropdownX = 8;
			dropdownY = el.offsetHeight + 4;
		} else {
			showDropdown = false;
		}
	}

	function selectUser(user: { id: string; name: string }) {
		if (!textarea) return;
		const cursorPos = textarea.selectionStart;
		const textBefore = textarea.value.slice(0, cursorPos);
		const textAfter = textarea.value.slice(cursorPos);
		const atIndex = textBefore.lastIndexOf('@');

		value = textBefore.slice(0, atIndex) + `@${user.name} ` + textAfter;
		onchange?.(value);
		showDropdown = false;

		// Restore focus
		requestAnimationFrame(() => {
			if (!textarea) return;
			const newPos = atIndex + user.name.length + 2;
			textarea.focus();
			textarea.setSelectionRange(newPos, newPos);
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (showDropdown && e.key === 'Escape') {
			showDropdown = false;
			e.stopPropagation();
		}
	}
</script>

<div bind:this={containerEl} class="relative">
	<textarea
		bind:this={textarea}
		bind:value
		oninput={handleInput}
		onkeydown={handleKeydown}
		{placeholder}
		{rows}
		class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
	></textarea>
	<MentionDropdown
		{users}
		query={mentionQuery}
		visible={showDropdown}
		x={dropdownX}
		y={dropdownY}
		onselect={selectUser}
	/>
</div>
