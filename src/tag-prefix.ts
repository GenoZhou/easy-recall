export const DEFAULT_DECK_TAG_PREFIX = 'easy-recall';

export function normalizeDeckTagPrefix(value: unknown): string {
	const rawValue = typeof value === 'string' ? value : '';
	const normalized = rawValue.trim().replace(/^#+/, '').replace(/\/+$/, '');
	return normalized || DEFAULT_DECK_TAG_PREFIX;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getDeckTagRegex(deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): RegExp {
	const prefix = escapeRegExp(normalizeDeckTagPrefix(deckTagPrefix));
	return new RegExp(`#${prefix}\\/([^\\s#]+)`);
}

export function getYamlDeckTagRegex(deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): RegExp {
	const prefix = escapeRegExp(normalizeDeckTagPrefix(deckTagPrefix));
	return new RegExp(`(?:^|\\s|-)#?${prefix}\\/([^\\s#]+)`);
}

export function hasDeckTagPrefix(tag: string, deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): boolean {
	const normalizedTag = tag.trim().replace(/^#+/, '');
	const normalizedPrefix = normalizeDeckTagPrefix(deckTagPrefix);
	return normalizedTag.startsWith(`${normalizedPrefix}/`);
}
