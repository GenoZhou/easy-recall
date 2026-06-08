import { App, SuggestModal, Notice, Vault } from 'obsidian';
import { Deck, Card } from '../types';
import { scanVault, groupByDecks, getDueCards } from '../deck';
import { formatDueDate, isDue } from '../scheduler';
import { error } from '../utils/';
import { t } from '../i18n';
import { ReviewSurface } from '../settings';
import { openReview } from './open-review';

/**
 * 带统计信息的卡组数据
 */
interface DeckWithStats extends Deck {
	dueCount: number;
	newCount: number;
	scheduledCount: number;
	nextReviewTime: string | null;
}

/**
 * 使用 SuggestModal 实现快速卡组选择
 * 优势：内置模糊搜索、键盘导航、Quick Switcher 式体验
 */
export class DeckSuggestModal extends SuggestModal<DeckWithStats> {
	private vault: Vault;
	private decks: DeckWithStats[] = [];
	private allCards: Card[] = [];
	private onReviewComplete?: () => void;
	private hasDueCards: boolean = false;
	private reviewSurface: ReviewSurface;
	private maxCardsPerReview: number;
	private deckTagPrefix: string;
	private clickToRevealCloze: boolean;
	private clickToRevealHardThreshold: number;
	private clickToRevealGoodThreshold: number;

	constructor(app: App, vault: Vault, reviewSurface: ReviewSurface, maxCardsPerReview: number, deckTagPrefix: string, onReviewComplete?: () => void, clickToRevealCloze?: boolean, clickToRevealHardThreshold?: number, clickToRevealGoodThreshold?: number) {
		super(app);
		this.vault = vault;
		this.reviewSurface = reviewSurface;
		this.maxCardsPerReview = maxCardsPerReview;
		this.deckTagPrefix = deckTagPrefix;
		this.onReviewComplete = onReviewComplete;
		this.clickToRevealCloze = clickToRevealCloze ?? false;
		this.clickToRevealHardThreshold = clickToRevealHardThreshold ?? 50;
		this.clickToRevealGoodThreshold = clickToRevealGoodThreshold ?? 80;
		
		const lang = t();
		// 设置空状态文本
		this.emptyStateText = lang.deckSelector.emptyState;
	}

	/**
	 * 异步加载数据
	 */
	async onOpen() {
		const lang = t();
		// 先显示加载状态
		this.resultContainerEl.setText(lang.deckSelector.loading);
		
		try {
			// 异步加载数据
			const allCards = await scanVault(this.vault, this.app, this.deckTagPrefix);
			this.allCards = allCards;
			
			const allDecks = groupByDecks(allCards);
			const dueCards = getDueCards(allCards);
			const dueDecks = groupByDecks(dueCards);
			
			// 检查是否有到期卡片
			this.hasDueCards = dueCards.length > 0;
			
			// 丰富卡组信息并排序（到期多的在前）
			this.decks = this.enrichDecks(allDecks, dueDecks)
				.sort((a, b) => b.dueCount - a.dueCount);
			
			// 清空加载提示
			this.resultContainerEl.empty();
			
			// 调用父类 onOpen 设置搜索
			await super.onOpen();
			
			// 设置 placeholder
			this.inputEl.placeholder = lang.deckSelector.placeholder;
			
			// 设置说明提示
			this.setInstructions([
				{ command: '↑↓', purpose: lang.deckSelector.instructions.navigate },
				{ command: '↵', purpose: lang.deckSelector.instructions.select },
				{ command: 'esc', purpose: lang.deckSelector.instructions.close }
			]);
			
		} catch (err) {
			error('Failed to load decks:', err);
			this.resultContainerEl.setText(lang.deckSelector.loadFailed);
		}
	}

	/**
	 * 丰富卡组信息
	 */
	private enrichDecks(allDecks: Deck[], dueDecks: Deck[]): DeckWithStats[] {
		return allDecks.map(deck => {
			const dueDeck = dueDecks.find(d => d.tag === deck.tag);
			const dueCount = dueDeck?.cards.length ?? 0;
			const newCount = deck.cards.filter(c => !c.schedule).length;
			const scheduledCount = deck.cards.filter(c => c.schedule).length;
			
			// 计算下次复习时间
			let nextReviewTime: string | null = null;
			if (dueCount === 0) {
				const nonDueCards = deck.cards
					.filter(c => c.schedule && !isDue(c.schedule))
					.sort((a, b) => a.schedule!.due.getTime() - b.schedule!.due.getTime());
				
				if (nonDueCards.length > 0) {
					nextReviewTime = formatDueDate(nonDueCards[0].schedule!.due, true);
				}
			}
			
			return {
				...deck,
				dueCount,
				newCount,
				scheduledCount,
				nextReviewTime
			};
		});
	}

	/**
	 * 创建"全部"虚拟卡组
	 */
	private createAllDeck(): DeckWithStats {
		const lang = t();
		const dueCards = this.allCards.filter(c => !c.schedule || isDue(c.schedule));
		return {
			tag: lang.deckSelector.allDeck.name,
			cards: dueCards,
			dueCount: dueCards.length,
			newCount: this.allCards.filter(c => !c.schedule).length,
			scheduledCount: this.allCards.filter(c => c.schedule).length,
			nextReviewTime: null
		};
	}

	/**
	 * 获取搜索建议
	 * 空查询时默认显示 @all（如果有到期卡片）
	 */
	getSuggestions(query: string): DeckWithStats[] {
		const normalized = query.toLowerCase().trim();
		
		// 特殊指令：@all 或 all - 只返回 @all
		if (normalized === '@all' || normalized === 'all') {
			return [this.createAllDeck()];
		}
		
		// 空查询时：@all 置顶（如果有到期卡片），后面跟所有卡组
		if (!normalized) {
			const suggestions = [...this.decks];
			if (this.hasDueCards) {
				suggestions.unshift(this.createAllDeck());
			}
			return suggestions;
		}
		
		// 模糊匹配：标签名包含查询字符串
		return this.decks.filter(deck => 
			deck.tag.toLowerCase().includes(normalized)
		);
	}

	/**
	 * 渲染每个建议项
	 */
	renderSuggestion(deck: DeckWithStats, el: HTMLElement) {
		const lang = t();
		const container = el.createDiv({ cls: 'er-suggest-item' });
		
		// 左侧：图标 + 名称
		const leftEl = container.createDiv({ cls: 'er-suggest-left' });
		
		// 根据状态选择图标
		let icon = '📁';
		if (deck.tag === lang.deckSelector.allDeck.name) icon = '📚';
		else if (deck.dueCount > 0) icon = '🔥';
		else if (deck.newCount > 0) icon = '🆕';
		else icon = '⏳';
		
		leftEl.createEl('span', { text: icon, cls: 'er-suggest-icon' });
		leftEl.createEl('span', { text: deck.tag, cls: 'er-suggest-name' });
		
		// 右侧：统计徽章
		const rightEl = container.createDiv({ cls: 'er-suggest-right' });
		
		if (deck.dueCount > 0) {
			rightEl.createEl('span', {
				text: lang.deckSelector.deckItem.due(deck.dueCount),
				cls: 'er-badge er-badge-due'
			});
		}
		
		if (deck.newCount > 0 && deck.tag !== lang.deckSelector.allDeck.name) {
			rightEl.createEl('span', {
				text: lang.deckSelector.deckItem.new(deck.newCount),
				cls: 'er-badge er-badge-new'
			});
		}
		
		// 如果无到期，显示下次复习时间或总数量
		if (deck.dueCount === 0) {
			if (deck.nextReviewTime) {
				rightEl.createEl('span', {
					text: deck.nextReviewTime,
					cls: 'er-badge er-badge-later'
				});
			} else if (deck.tag !== lang.deckSelector.allDeck.name) {
				rightEl.createEl('span', {
					text: lang.deckSelector.deckItem.total(deck.cards.length),
					cls: 'er-badge er-badge-total'
				});
			}
		}
		
		// @all 特殊显示
		if (deck.tag === lang.deckSelector.allDeck.name) {
			rightEl.createEl('span', {
				text: lang.deckSelector.allDeck.total(deck.dueCount),
				cls: 'er-badge er-badge-all'
			});
		}
	}

	/**
	 * 选择处理
	 */
	onChooseSuggestion(deck: DeckWithStats, evt: MouseEvent | KeyboardEvent) {
		const lang = t();
		const cardsToReview = deck.tag === lang.deckSelector.allDeck.name
			? this.getAllDueCards()
			: deck.cards.filter(c => !c.schedule || isDue(c.schedule));
		
		if (cardsToReview.length === 0) {
			new Notice(lang.notifications.noDueCards, 2000);
			return;
		}
		
		this.close();
		
		// 延迟打开，避免模态框动画冲突
		window.setTimeout(() => {
			void openReview(this.app, {
				cards: cardsToReview,
				vault: this.vault,
				maxCardsPerReview: this.maxCardsPerReview,
				reloadCards: () => this.getDueCardsForDeck(deck.tag),
				onComplete: () => {
					if (this.onReviewComplete) {
						this.onReviewComplete();
					}
				},
				clickToRevealCloze: this.clickToRevealCloze,
				clickToRevealHardThreshold: this.clickToRevealHardThreshold,
				clickToRevealGoodThreshold: this.clickToRevealGoodThreshold,
			}, this.reviewSurface);
		}, 100);
	}

	/**
	 * 获取所有到期卡片
	 */
	private getAllDueCards(): Card[] {
		return this.allCards.filter(c => !c.schedule || isDue(c.schedule));
	}

	private async getDueCardsForDeck(deckTag: string): Promise<Card[]> {
		const lang = t();
		const allCards = await scanVault(this.vault, this.app, this.deckTagPrefix);
		const dueCards = getDueCards(allCards);

		if (deckTag === lang.deckSelector.allDeck.name) {
			return dueCards;
		}

		return dueCards.filter(card => {
			const primaryTag = card.tags.length > 0 ? card.tags[0] : 'default';
			return primaryTag === deckTag;
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

/**
 * 打开卡组选择器的便捷函数
 */
export async function openDeckModal(
	app: App,
	vault: Vault,
	reviewSurface: ReviewSurface,
	maxCardsPerReview: number,
	deckTagPrefix: string,
	onComplete?: () => void,
	clickToRevealCloze?: boolean,
	clickToRevealHardThreshold?: number,
	clickToRevealGoodThreshold?: number
): Promise<void> {
	new DeckSuggestModal(app, vault, reviewSurface, maxCardsPerReview, deckTagPrefix, onComplete, clickToRevealCloze, clickToRevealHardThreshold, clickToRevealGoodThreshold).open();
}
