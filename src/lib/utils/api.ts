function getCsrfToken(): string | null {
	const match = document.cookie.match(/(?:^|;\s*)pm_csrf=([^;]*)/);
	return match ? match[1] : null;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options?.headers as Record<string, string>)
	};

	const csrfToken = getCsrfToken();
	if (csrfToken) {
		headers['x-csrf-token'] = csrfToken;
	}

	const res = await fetch(path, {
		...options,
		headers
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body.error || `Request failed: ${res.status}`);
	}

	return res.json();
}
