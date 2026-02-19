type ShortcutHandler = () => void;

const shortcuts = new Map<string, ShortcutHandler>();
const metaShortcuts = new Map<string, ShortcutHandler>();

// Scope stack for contextual shortcuts
const scopeStack: Array<{ shortcuts: Map<string, ShortcutHandler>; shiftShortcuts: Map<string, ShortcutHandler> }> = [];

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

/** Push a contextual scope — its shortcuts override globals while active */
export function pushScope(
	bindings: Record<string, ShortcutHandler>,
	shiftBindings: Record<string, ShortcutHandler> = {}
) {
	const scope = {
		shortcuts: new Map(Object.entries(bindings)),
		shiftShortcuts: new Map(Object.entries(shiftBindings))
	};
	scopeStack.push(scope);
	return scope;
}

/** Pop the given scope off the stack */
export function popScope(scope: ReturnType<typeof pushScope>) {
	const idx = scopeStack.indexOf(scope);
	if (idx >= 0) scopeStack.splice(idx, 1);
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

	// Check scoped shortcuts first (top of stack wins)
	for (let i = scopeStack.length - 1; i >= 0; i--) {
		const scope = scopeStack[i];
		if (e.shiftKey) {
			const handler = scope.shiftShortcuts.get(e.key.toLowerCase());
			if (handler) {
				e.preventDefault();
				handler();
				return;
			}
		}
		const handler = scope.shortcuts.get(e.key.toLowerCase());
		if (handler) {
			e.preventDefault();
			handler();
			return;
		}
	}

	const handler = shortcuts.get(e.key.toLowerCase());
	if (handler) {
		e.preventDefault();
		handler();
	}
}

interface ShortcutHelp {
	key: string;
	description: string;
}

interface ShortcutGroup {
	group: string;
	shortcuts: ShortcutHelp[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
	{
		group: 'Navigation',
		shortcuts: [
			{ key: 'D', description: 'Go to dashboard' },
			{ key: 'P', description: 'Go to projects' },
			{ key: 'M', description: 'Go to my tasks' },
			{ key: 'A', description: 'Go to activity' }
		]
	},
	{
		group: 'Actions',
		shortcuts: [
			{ key: 'C', description: 'New task (on board)' },
			{ key: 'N', description: 'Quick create task' },
			{ key: '/', description: 'Search' },
			{ key: 'Cmd+K', description: 'Search / Commands' },
			{ key: '?', description: 'Show shortcuts' }
		]
	},
	{
		group: 'Lists',
		shortcuts: [
			{ key: 'J', description: 'Next item' },
			{ key: 'K', description: 'Previous item' },
			{ key: 'Enter', description: 'Open focused item' }
		]
	},
	{
		group: 'Task Detail',
		shortcuts: [
			{ key: '1-4', description: 'Change status (by column)' },
			{ key: 'Shift+1-4', description: 'Change priority' },
			{ key: 'Esc', description: 'Close panel/modal' }
		]
	}
];

// Flattened for backward compat
export const SHORTCUT_HELP = SHORTCUT_GROUPS.flatMap((g) => g.shortcuts);
