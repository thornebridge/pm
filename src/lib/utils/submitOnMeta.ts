/** Svelte action: fires callback on Ctrl+Enter / Cmd+Enter */
export function submitOnMeta(node: HTMLElement, callback: () => void) {
	function handler(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			callback();
		}
	}
	node.addEventListener('keydown', handler);
	return {
		update(newCallback: () => void) {
			callback = newCallback;
		},
		destroy() {
			node.removeEventListener('keydown', handler);
		}
	};
}
