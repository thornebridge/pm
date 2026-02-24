import { MeiliSearch } from 'meilisearch';

const host = process.env.MEILISEARCH_HOST || '';
const apiKey = process.env.MEILISEARCH_API_KEY || '';

let client: MeiliSearch | null = null;

export function getSearchClient(): MeiliSearch | null {
	if (!host) return null;
	if (!client) {
		client = new MeiliSearch({ host, apiKey });
	}
	return client;
}

export function isMeilisearchEnabled(): boolean {
	return !!host;
}

/** Add or update a single document (fire-and-forget). */
export function indexDocument(indexName: string, doc: Record<string, unknown>): void {
	const c = getSearchClient();
	if (!c) return;
	c.index(indexName).addDocuments([doc]).catch((err) => {
		console.error(`[search] Failed to index doc in ${indexName}:`, err.message);
	});
}

/** Add or update multiple documents (fire-and-forget). */
export function indexDocuments(indexName: string, docs: Record<string, unknown>[]): void {
	if (docs.length === 0) return;
	const c = getSearchClient();
	if (!c) return;
	c.index(indexName).addDocuments(docs).catch((err) => {
		console.error(`[search] Failed to index ${docs.length} docs in ${indexName}:`, err.message);
	});
}

/** Remove a single document by ID (fire-and-forget). */
export function removeDocument(indexName: string, docId: string): void {
	const c = getSearchClient();
	if (!c) return;
	c.index(indexName).deleteDocument(docId).catch((err) => {
		console.error(`[search] Failed to remove doc ${docId} from ${indexName}:`, err.message);
	});
}

/** Remove multiple documents by ID (fire-and-forget). */
export function removeDocuments(indexName: string, docIds: string[]): void {
	if (docIds.length === 0) return;
	const c = getSearchClient();
	if (!c) return;
	c.index(indexName).deleteDocuments(docIds).catch((err) => {
		console.error(`[search] Failed to remove ${docIds.length} docs from ${indexName}:`, err.message);
	});
}
