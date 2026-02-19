type ShortcutHandler = () => void;

const shortcuts = new Map<string, ShortcutHandler>();
const metaShortcuts = new Map<string, ShortcutHandler>();

export function registerShortcut(key: string, handler: ShortcutHandler) {
	shortcuts.set(key, handler);
}

export function unregisterShortcut(key: string) {
	shortcuts.delete(key);
}

export function registerMetaShortcut(key: string, handler: ShortcutHandler) {
	metaShortcuts.set(key, handler);
}

export function unregisterMetaShortcut(key: string) {
	metaShortcuts.delete(key);
}

export function handleGlobalKeydown(e: KeyboardEvent) {
	// Handle Cmd/Ctrl shortcuts first
	if ((e.ctrlKey || e.metaKey) && !e.altKey) {
		const handler = metaShortcuts.get(e.key.toLowerCase());
		if (handler) {
			e.preventDefault();
			handler();
			return;
		}
	}

	// Don't fire single-key shortcuts in inputs/textareas
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
	{ key: 'C', description: 'New task (on board)' },
	{ key: 'D', description: 'Go to dashboard' },
	{ key: 'P', description: 'Go to projects' },
	{ key: 'M', description: 'Go to my tasks' },
	{ key: 'A', description: 'Go to activity' },
	{ key: '/', description: 'Search' },
	{ key: 'Cmd+K', description: 'Search' },
	{ key: '?', description: 'Show shortcuts' },
	{ key: 'Esc', description: 'Close panel/modal' }
];
