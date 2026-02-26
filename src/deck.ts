import { TFile, Vault, App, Notice } from 'obsidian';
import { Card, Deck } from './types';
import { parseNote } from './parser';
import { isDue } from './scheduler/index';
import { error } from './utils/';

/**
 * 使用 MetadataCache 快速筛选包含 ob-reviews 标签的文件
 * 符合 Obsidian 最佳实践：利用内置缓存而非全量扫描
 */
export function getReviewFiles(app: App): TFile[] {
	const allFiles = app.vault.getMarkdownFiles();
	
	return allFiles.filter(file => {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) return false;
		
		// 检查 frontmatter 中的 tags
		const frontmatterTags = cache.frontmatter?.tags || [];
		const frontmatterTagList = Array.isArray(frontmatterTags) 
			? frontmatterTags 
			: [frontmatterTags];
		
		// 检查内联标签 (metadataCache.tags 包含 #ob-reviews/xxx 格式)
		const inlineTags = (cache.tags || []).map((t: { tag: string }) => t.tag);
		
		const allTags = [...frontmatterTagList, ...inlineTags];
		return allTags.some((tag: string) => 
			typeof tag === 'string' && tag.includes('ob-reviews/')
		);
	});
}

/**
 * 扫描整个 Vault，提取所有卡片
 * 使用分批处理避免阻塞 UI
 * 
 * 注意：当传入 app 参数时，会使用 MetadataCache 预筛选文件，大幅提升性能
 */
export async function scanVault(vault: Vault, app?: App): Promise<Card[]> {
	const cards: Card[] = [];
	
	// 如果有 App 实例，使用 MetadataCache 预筛选（Obsidian 最佳实践）
	const filesToScan = app ? getReviewFiles(app) : vault.getMarkdownFiles();
	
	const BATCH_SIZE = 10; // 每批处理 10 个文件

	for (let i = 0; i < filesToScan.length; i++) {
		const file = filesToScan[i];
		try {
			const content = await vault.read(file);
			const fileCards = parseNote(content, file.path);
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
export async function getDueDecks(vault: Vault, app?: App): Promise<Deck[]> {
	const allCards = await scanVault(vault, app);
	const dueCards = getDueCards(allCards);
	return groupByDecks(dueCards);
}

/**
 * 从特定文件获取卡片
 */
export async function getCardsFromFile(vault: Vault, file: TFile): Promise<Card[]> {
	const content = await vault.read(file);
	return parseNote(content, file.path);
}

/**
 * 从特定文件获取到期卡片
 */
export async function getDueCardsFromFile(vault: Vault, file: TFile): Promise<Card[]> {
	const cards = await getCardsFromFile(vault, file);
	return getDueCards(cards);
}
