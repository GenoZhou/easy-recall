import { App, Modal, MarkdownRenderer, TFile, Vault, Component, Notice, Platform } from 'obsidian';
import { Card, Rating } from '../types';
import { calcSchedule, getNextReviewShortText } from '../scheduler/index';
import { getRatingButtons } from '../config/constants';
import { injectSchedule } from '../store';
import { renderClozeContent, renderQAContent } from '../parser';
import { error } from '../utils/';
import { t } from '../i18n';

export interface ReviewModalOptions {
	cards: Card[];
	vault: Vault;
	onComplete?: () => void;
}

export class ReviewModal extends Modal {
	private cards: Card[];
	private currentIndex: number = 0;
	private showAnswer: boolean = false;
	private showHint: boolean = false;
	private vault: Vault;
	private onComplete?: () => void;
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;

	constructor(app: App, options: ReviewModalOptions) {
		super(app);
		const now = new Date();
		
		// 过滤掉未到期的卡片（包括刚才标记为 Again 但还没到时间的）
		this.cards = options.cards.filter(card => {
			if (!card.schedule) return true; // 新卡片，可以复习
			return card.schedule.due <= now; // 只保留已到期的
		});
		
		this.vault = options.vault;
		this.onComplete = options.onComplete;
		
		// 按到期时间排序
		this.cards.sort((a, b) => {
			const dueA = a.schedule?.due?.getTime() || 0;
			const dueB = b.schedule?.due?.getTime() || 0;
			return dueA - dueB;
		});
	}

	onOpen() {
		const lang = t();
		const { contentEl, titleEl } = this;
		
		contentEl.addClass('obr-review-modal');
		titleEl.setText(lang.review.title);
		
		this.cardContentEl = contentEl.createDiv({ cls: 'obr-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'obr-buttons' });
		
		this.renderCard();
		
		// 快捷键：Enter 显示答案
		this.scope.register([], 'Enter', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.handleShowAnswer();
			return false;
		});
		
		// 评分快捷键 1-3
		const ratings: Rating[] = [1, 2, 3];
		ratings.forEach(rating => {
			this.scope.register([], String(rating), (evt: KeyboardEvent) => {
				evt.preventDefault();
				if (this.showAnswer) {
					this.handleRate(rating);
				}
				return false;
			});
		});
	}

	/**
	 * 显示答案
	 */
	private handleShowAnswer() {
		if (!this.showAnswer) {
			this.showAnswer = true;
			// 显示答案时自动显示 hint（如果存在）
			this.showHint = true;
			this.renderCard();
		}
	}

	/**
	 * 显示提示
	 */
	private handleShowHint() {
		if (!this.showHint) {
			this.showHint = true;
			this.renderCard();
		}
	}

	/**
	 * 渲染当前卡片
	 */
	private async renderCard() {
		const lang = t();
		if (this.currentIndex >= this.cards.length) {
			this.completeReview();
			return;
		}

		const card = this.cards[this.currentIndex];
		
		this.titleEl.setText(lang.review.progress(this.currentIndex + 1, this.cards.length));
		
		this.cardContentEl?.empty();
		this.buttonsContainerEl?.empty();

		if (!this.cardContentEl || !this.buttonsContainerEl) return;

		// 显示标签
		if (card.tags.length > 0) {
			const tagEl = this.cardContentEl.createDiv({ cls: 'obr-tags' });
			card.tags.forEach(tag => {
				tagEl.createSpan({
					text: `#${tag}`,
					cls: 'obr-tag'
				});
			});
		}

		// 渲染卡片内容
		const cardBody = this.cardContentEl.createDiv({ cls: 'obr-card-body' });
		
		let renderContent: string;
		if (card.type === 'cloze') {
			renderContent = renderClozeContent(card.content, this.showAnswer);
		} else {
			renderContent = renderQAContent(card.question || '', card.answer || '', this.showAnswer);
		}

		const component = new Component();
		await MarkdownRenderer.renderMarkdown(
			renderContent,
			cardBody,
			card.filePath,
			component
		);

		// 渲染提示（如果已显示）
		if (this.showHint && card.hint) {
			await this.renderHint(card.hint, card.filePath);
		}

		this.renderButtons(card);
	}

	/**
	 * 渲染提示内容
	 * 直接渲染原始 callout 文本到 card-body
	 */
	private async renderHint(hint: string, filePath: string) {
		const cardBody = this.cardContentEl?.querySelector('.obr-card-body');
		if (!cardBody) return;

		// 直接渲染原始 callout 文本（不再拼接）
		const component = new Component();
		await MarkdownRenderer.renderMarkdown(hint, cardBody as HTMLElement, filePath, component);
	}

	/**
	 * 渲染按钮
	 */
	private renderButtons(card: Card) {
		const lang = t();
		this.buttonsContainerEl?.empty();
		if (!this.buttonsContainerEl) return;

		if (!this.showAnswer) {
			// 创建按钮容器（并排显示）
			const btnContainer = this.buttonsContainerEl.createDiv({ cls: 'obr-buttons-row' });
			
			// 显示提示按钮（如果卡片有提示且未显示）
			if (card.hint && !this.showHint) {
				const showHintBtn = btnContainer.createEl('button', {
					text: lang.review.showHint,
					cls: 'obr-btn-show-hint'
				});
				showHintBtn.addEventListener('click', () => this.handleShowHint());
			}
			
			// 显示答案按钮
			const showBtn = btnContainer.createEl('button', {
				text: lang.review.showAnswer,
				cls: 'obr-btn-show mod-cta'
			});
			showBtn.addEventListener('click', () => {
				this.showAnswer = true;
				this.showHint = true; // 显示答案时自动显示提示
				this.renderCard();
			});
		} else {
			// 使用集中配置的三评分按钮
			const btnContainer = this.buttonsContainerEl.createDiv({ cls: 'obr-rating-buttons obr-rating-3' });
			const card = this.cards[this.currentIndex];
			
			// 检测是否为桌面端（非移动端）
			const isDesktop = !Platform.isMobile;
			
			getRatingButtons().forEach(btn => {
				const buttonEl = btnContainer.createEl('button', {
					cls: `obr-btn-rating ${btn.cls}`
				});
				
				// 按钮标签
				buttonEl.createSpan({ text: btn.label, cls: 'obr-btn-label' });
				
				// 桌面端显示预计时间（没记住不显示）
				if (isDesktop && card && btn.rating !== 1) {
					const timeText = getNextReviewShortText(card.schedule, btn.rating);
					buttonEl.createSpan({ text: timeText, cls: 'obr-btn-time' });
				}
				
				buttonEl.addEventListener('click', () => this.handleRate(btn.rating));
			});
		}
	}

	/**
	 * 处理评分
	 * @param rating 评分等级 1-3
	 * 
	 * 使用 Vault.process() 符合 Obsidian 最佳实践：
	 * - 原子性操作，内部优化缓存一致性
	 * - 避免连续 I/O（read-modify-read），减少 50% 文件操作
	 */
	private async handleRate(rating: Rating) {
		const card = this.cards[this.currentIndex];
		if (!card) return;

		const newSchedule = calcSchedule(card.schedule ?? null, rating);

		try {
			const file = this.vault.getAbstractFileByPath(card.filePath);
			if (file && file instanceof TFile) {
				// 使用 Vault.process() 进行原子性读写
				// 符合 Obsidian 最佳实践，内部处理缓存一致性
				// SR 注释放在 lineStart 前
				await this.vault.process(file, (content) => {
					return injectSchedule(content, newSchedule, card.lineStart, card.scheduleLine);
				});
				
				// 不需要重新读取文件！直接根据修改逻辑计算行号变化
				// 这是性能关键优化：避免了一次文件读取 + 重新解析
				const isNewScheduleLine = !card.scheduleLine;
				const lineShift = isNewScheduleLine ? 1 : 0;
				
				// 保存原始 lineStart 用于比较（在新插入 SR 注释前）
				const originalLineStart = card.lineStart;
				
				// 更新当前卡片
				card.schedule = newSchedule;
				if (isNewScheduleLine) {
					// 新插入的 SR 注释在 lineStart 前
					card.scheduleLine = card.lineStart - 1;
					// 当前卡片的行号也需要 +1，因为前面插入了新行
					card.lineStart += 1;
					card.lineEnd += 1;
				}
				
				// 更新队列中同文件其他卡片的行号（如果它们在修改位置之后）
				// SR 注释在 originalLineStart 前，影响 lineStart >= originalLineStart 的卡片
				for (const queueCard of this.cards) {
					// 跳过当前卡片（已更新）
					if (queueCard.id === card.id) continue;
					
					// 只处理同文件且在修改位置之后的卡片
					if (queueCard.filePath === card.filePath && queueCard.lineStart >= originalLineStart) {
						queueCard.lineStart += lineShift;
						queueCard.lineEnd += lineShift;
						if (queueCard.scheduleLine !== undefined) {
							queueCard.scheduleLine += lineShift;
						}
					}
				}
			}

			if (rating === 1) {
				// 没记住: 更新 schedule（降低 ease），但立即放回队尾
				const currentCard = this.cards[this.currentIndex];
				
				// 从当前位置移除
				this.cards.splice(this.currentIndex, 1);
				// 放回队尾（立即重新复习）
				this.cards.push(currentCard);
				
				this.showAnswer = false;
				this.showHint = false;
				
				// 如果当前索引超出范围，重置为0
				if (this.currentIndex >= this.cards.length) {
					this.currentIndex = 0;
				}
				
				this.renderCard();
			} else {
				// 有点难/记住了: 下一张卡片
				this.currentIndex++;
				this.showAnswer = false;
				this.showHint = false;
				this.renderCard();
			}
		} catch (err) {
			error('Failed to update schedule:', err);
			// 显示用户友好的错误提示
			new Notice(t().notifications.failedToSave, 3000);
			// 不自动进入下一题，让用户知道失败了
			return;
		}
	}

	/**
	 * 完成复习 - 关闭模态框并返回卡组界面
	 */
	private completeReview() {
		// 直接关闭，通过 onComplete 回调让卡组界面重新加载
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		if (this.onComplete) {
			this.onComplete();
		}
	}
}
