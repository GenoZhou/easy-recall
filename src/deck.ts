import { TFile, Vault, App, Notice, CachedMetadata } from 'obsidian';
import { Card, Deck } from './types';
import { parseNote } from './parser';
import { isDue } from './scheduler';
import { error } from './utils/';
import { DEFAULT_DECK_TAG_PREFIX, hasDeckTagPrefix } from './tag-prefix';

/**
 * 使用 MetadataCache 已索引的条目筛选包含 easy-recall 标签的文件
 */
export function getReviewFiles(app: App, deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): TFile[] {
	const markdownFiles = app.vault.getMarkdownFiles();
	const getFileCache = app.metadataCache?.getFileCache?.bind(app.metadataCache);

	// 如果 MetadataCache 预过滤器不可用，回退到所有 Markdown 文件，
	// 防止因内部 API 缺失导致全局复习静默返回空结果。
	if (!getFileCache) {
		return markdownFiles;
	}

	return markdownFiles.filter(file => {
		const cache = getFileCache(file);
		// 缓存缺失时包含该文件，避免静默跳过潜在的复习文件
		if (!cache) return true;
		return hasReviewTag(cache, deckTagPrefix);
	});
}

function hasReviewTag(cache: CachedMetadata | null | undefined, deckTagPrefix: string): boolean {
	if (!cache) return false;

	const frontmatterTags = cache.frontmatter?.tags || [];
	const frontmatterTagList = Array.isArray(frontmatterTags)
		? frontmatterTags
		: [frontmatterTags];
	const inlineTags = (cache.tags || []).map((t: { tag: string }) => t.tag);

	return [...frontmatterTagList, ...inlineTags].some((tag: string) =>
		typeof tag === 'string' && hasDeckTagPrefix(tag, deckTagPrefix)
	);
}

/**
 * 扫描 MetadataCache 中带复习标签的文件，提取所有卡片
 * 使用分批处理避免阻塞 UI
 * 
 */
export async function scanVault(vault: Vault, app?: App, deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): Promise<Card[]> {
	const cards: Card[] = [];
	const filesToScan = app ? getReviewFiles(app, deckTagPrefix) : [];
	
	const BATCH_SIZE = 10; // 每批处理 10 个文件

	for (let i = 0; i < filesToScan.length; i++) {
		const file = filesToScan[i];
		try {
			const content = await vault.read(file);
			const fileCards = parseNote(content, file.path, deckTagPrefix);
			cards.push(...fileCards);
		} catch (err) {
			error(`Failed to parse ${file.path}:`, err);
			// 继续处理其他文件，不中断整个扫描
		}

		// 每处理一批后让出时间片，避免阻塞 UI
		if ((i + 1) % BATCH_SIZE === 0) {
			await new Promise(resolve => setTimeout(resolve, 0));
		}
	}

	return cards;
}

/**
 * 按标签分组卡片为牌组
 */
export function groupByDecks(cards: Card[]): Deck[] {
	const deckMap = new Map<string, Card[]>();

	for (const card of cards) {
		// 使用第一个标签作为主牌组，如果没有标签则归入默认牌组
		const primaryTag = card.tags.length > 0 ? card.tags[0] : 'default';
		
		if (!deckMap.has(primaryTag)) {
			deckMap.set(primaryTag, []);
		}
		deckMap.get(primaryTag)!.push(card);
	}

	// 转换为 Deck 数组
	const decks: Deck[] = [];
	for (const [tag, deckCards] of deckMap) {
		decks.push({
			tag,
			cards: deckCards,
		});
	}

	// 按标签名排序
	decks.sort((a, b) => a.tag.localeCompare(b.tag));

	return decks;
}

/**
 * 筛选出到期的卡片
 */
export function getDueCards(cards: Card[]): Card[] {
	return cards.filter(card => isDue(card.schedule));
}

/**
 * 获取所有到期卡片的牌组
 * 当传入 app 参数时，使用 MetadataCache 优化性能
 */
export async function getDueDecks(vault: Vault, app?: App, deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): Promise<Deck[]> {
	const allCards = await scanVault(vault, app, deckTagPrefix);
	const dueCards = getDueCards(allCards);
	return groupByDecks(dueCards);
}

/**
 * 从特定文件获取卡片
 */
export async function getCardsFromFile(vault: Vault, file: TFile, deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): Promise<Card[]> {
	const content = await vault.read(file);
	return parseNote(content, file.path, deckTagPrefix);
}

/**
 * 从特定文件获取到期卡片
 */
export async function getDueCardsFromFile(vault: Vault, file: TFile, deckTagPrefix: string = DEFAULT_DECK_TAG_PREFIX): Promise<Card[]> {
	const cards = await getCardsFromFile(vault, file, deckTagPrefix);
	return getDueCards(cards);
}
