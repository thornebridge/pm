export function formatCurrency(cents: number, currency = 'USD'): string {
	const dollars = cents / 100;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(dollars);
}

export function formatCurrencyExact(cents: number, currency = 'USD'): string {
	const dollars = cents / 100;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(dollars);
}

export function parseCurrency(input: string): number {
	const cleaned = input.replace(/[^0-9.-]/g, '');
	const dollars = parseFloat(cleaned);
	if (isNaN(dollars)) return 0;
	return Math.round(dollars * 100);
}
