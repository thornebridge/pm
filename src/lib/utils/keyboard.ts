type ShortcutHandler = () => void;

const shortcuts = new Map<string, ShortcutHandler>();

export function registerShortcut(key: string, handler: ShortcutHandler) {
	shortcuts.set(key, handler);
}

export function unregisterShortcut(key: string) {
	shortcuts.delete(key);
}

export function handleGlobalKeydown(e: KeyboardEvent) {
	// Don't fire in inputs/textareas
	const target = e.target as HTMLElement;
	if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
		return;
	}

	if (e.ctrlKey || e.metaKey || e.altKey) return;

	const handler = shortcuts.get(e.key.toLowerCase());
	if (handler) {
		e.preventDefault();
		handler();
	}
}

export const SHORTCUT_HELP = [
	{ key: 'C', description: 'New task' },
	{ key: 'P', description: 'Switch project' },
	{ key: '/', description: 'Search' },
	{ key: '?', description: 'Show shortcuts' }
];
