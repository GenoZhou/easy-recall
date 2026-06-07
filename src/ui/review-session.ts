import { App, MarkdownRenderer, TFile, Vault, Component, Notice, Platform, MarkdownView, Scope, KeymapEventHandler } from 'obsidian';
import { Card, Rating, Schedule } from '../types';
import { calcSchedule, getNextReviewShortText } from '../scheduler';
import { getRatingButtons, KEYBOARD_SHORTCUTS } from '../config/constants';
import { injectSchedule, deleteScheduleLine } from '../store';
import { renderClozeContent, renderQAContent } from '../parser';
import { error } from '../utils/';
import { t } from '../i18n';

export interface ReviewOptions {
	cards: Card[];
	vault: Vault;
	maxCardsPerReview?: number;
	reloadCards?: () => Promise<Card[]>;
	onComplete?: () => void;
	clickToRevealCloze?: boolean;
	clickToRevealHardThreshold?: number;
	clickToRevealGoodThreshold?: number;
}

export interface ReviewCompletionState {
	remainingDueCount: number;
}

export interface ReviewSessionHost {
	contentEl: HTMLElement;
	buttonsEl: HTMLElement;
	setTitle(title: string): void;
	complete(state: ReviewCompletionState): void;
	openSource(card: Card): Promise<boolean>;
	areShortcutsActive?(): boolean;
	handleCompleteSpace?(): void;
}

interface ReviewStatusTag {
	label: string;
	cls: string;
}

type ClozeRevealState = 'hidden' | 'shown' | 'deleted';

interface ClozeRevealStats {
	total: number;
	hidden: number;
	shown: number;
	deleted: number;
}

interface RateHistoryEntry {
	cardId: string;
	cardIndex: number;
	wasAgain: boolean;
	originalSchedule: Schedule | undefined;
	originalScheduleLine: number | undefined;
	originalLineStart: number;
	originalLineEnd: number;
	affectedCards: Array<{
		cardId: string;
		lineStart: number;
		lineEnd: number;
		scheduleLine?: number;
	}>;
}

function isNewReviewCard(card: Card): boolean {
	return !card.schedule || card.schedule.reps === 0;
}

export function normalizeReviewBoolean(value: unknown): boolean {
	return value === true;
}

export function buildHeadingPathLabel(card: Card): string | null {
	if (!card.headingPath?.length) {
		return null;
	}

	const fileName = card.filePath.split('/').pop()?.replace(/\.md$/i, '') || card.filePath;
	const parts = [fileName, ...card.headingPath];
	return parts.join(' / ');
}

export function getReviewStatusTags(card: Card): ReviewStatusTag[] {
	const lang = t();
	const statusTags: ReviewStatusTag[] = [];

	if (isNewReviewCard(card)) {
		statusTags.push({
			label: lang.review.statusTags.newCard,
			cls: 'er-status-tag-new',
		});
	}

	return statusTags;
}

export async function openCardSource(
	app: App,
	vault: Vault,
	card: Card,
	openInNewLeaf: boolean = false
): Promise<boolean> {
	const file = vault.getAbstractFileByPath(card.filePath);
	if (!(file instanceof TFile)) {
		return false;
	}

	const leaf = app.workspace.getLeaf(openInNewLeaf ? 'tab' : false);
	await leaf.openFile(file, {
		active: true,
		eState: {
			mode: 'source',
			line: card.lineStart
		}
	});

	await app.workspace.revealLeaf(leaf);

	if (leaf.isDeferred) {
		await leaf.loadIfDeferred();
	}

	if (leaf.view instanceof MarkdownView) {
		leaf.view.editor?.setCursor({ line: card.lineStart, ch: 0 });
	}

	return true;
}

export class ReviewSession {
	private app: App;
	private vault: Vault;
	private host: ReviewSessionHost;
	private sourceCards: Card[];
	private cards: Card[];
	private completedCardIds: Set<string> = new Set();
	private currentIndex: number = 0;
	private showAnswer: boolean = false;
	private showHint: boolean = false;
	private isComplete: boolean = false;
	private shortcutScope: Scope | null = null;
	private shortcutHandlers: KeymapEventHandler[] = [];
	private clickToRevealCloze: boolean = false;
	private clickToRevealHardThreshold: number = 50;
	private clickToRevealGoodThreshold: number = 80;
	private clozeRevealStatesByCardId: Map<string, ClozeRevealState[]> = new Map();
	private lastRateEntry: RateHistoryEntry | null = null;

	constructor(app: App, options: ReviewOptions, host: ReviewSessionHost) {
		this.app = app;
		this.vault = options.vault;
		this.host = host;
		this.sourceCards = options.cards;
		this.cards = this.getDueSortedCards(options.cards, options.maxCardsPerReview);
		this.clickToRevealCloze = normalizeReviewBoolean(options.clickToRevealCloze);
		this.clickToRevealHardThreshold = options.clickToRevealHardThreshold ?? 50;
		this.clickToRevealGoodThreshold = options.clickToRevealGoodThreshold ?? 80;
	}

	registerShortcuts(scope: Scope): void {
		if (Platform.isMobile) {
			return;
		}

		this.unregisterShortcuts();
		this.shortcutScope = scope;

		this.shortcutHandlers.push(scope.register([], KEYBOARD_SHORTCUTS.REVEAL, (evt: KeyboardEvent) => {
			return this.handleShortcutEvent(evt, KEYBOARD_SHORTCUTS.REVEAL);
		}));

		KEYBOARD_SHORTCUTS.RATINGS.forEach(shortcut => {
			this.shortcutHandlers.push(scope.register([], shortcut, (evt: KeyboardEvent) => {
				return this.handleShortcutEvent(evt, shortcut);
			}));
		});

		this.shortcutHandlers.push(scope.register([], KEYBOARD_SHORTCUTS.UNDO, (evt: KeyboardEvent) => {
			return this.handleShortcutEvent(evt, KEYBOARD_SHORTCUTS.UNDO);
		}));
	}

	handleShortcutEvent(evt: KeyboardEvent, fallbackKey?: string): boolean {
		if (Platform.isMobile) {
			return true;
		}

		if (this.shouldIgnoreShortcutEvent(evt)) {
			return true;
		}

		const key = evt.key || fallbackKey;
		const card = this.cards[this.currentIndex];
		const isClickRevealClozeCard = this.isClickRevealClozeCard(card);
		const ratingShortcut = KEYBOARD_SHORTCUTS.RATINGS.find(shortcut => shortcut === key);

		if (isClickRevealClozeCard) {
			if ((key === KEYBOARD_SHORTCUTS.REVEAL || key === ' ') && card?.hint && !this.showHint) {
				evt.preventDefault();
				if (!evt.repeat) {
					this.handleShowHint();
				}
				return false;
			}

			// In click-reveal mode, Space/Reveal does nothing else; do not swallow.
			if (key === KEYBOARD_SHORTCUTS.REVEAL || key === ' ') {
				return true;
			}
		}

		if (this.isComplete && (key === KEYBOARD_SHORTCUTS.REVEAL || key === ' ')) {
			evt.preventDefault();
			if (!evt.repeat) {
				this.host.handleCompleteSpace?.();
			}
			return false;
		}

		if (key === KEYBOARD_SHORTCUTS.REVEAL || key === ' ') {
			evt.preventDefault();
			if (!evt.repeat) {
				this.handleRevealShortcut();
			}
			return false;
		}

		if (ratingShortcut) {
			evt.preventDefault();
			this.rateAction(Number(ratingShortcut) as Rating);
			return false;
		}

		if (key === KEYBOARD_SHORTCUTS.UNDO) {
			evt.preventDefault();
			void this.undo();
			return false;
		}

		return true;
	}

	private shouldIgnoreShortcutEvent(evt: KeyboardEvent): boolean {
		const target = evt.target;
		if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
			return false;
		}

		if (target.isContentEditable) {
			return true;
		}

		const tagName = target.tagName.toLowerCase();
		return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
	}

	unregisterShortcuts(): void {
		if (this.shortcutScope) {
			this.shortcutHandlers.forEach(handler => this.shortcutScope?.unregister(handler));
		}
		this.shortcutHandlers = [];
		this.shortcutScope = null;
	}

	dispose(): void {
		this.unregisterShortcuts();
	}

	showAnswerAction(): void {
		this.handleShowAnswer();
	}

	rateAction(rating: Rating): void {
		const autoRating = this.getCurrentClickRevealRating();
		if (autoRating !== null && autoRating === rating) {
			void this.handleRate(rating);
			return;
		}

		if (this.showAnswer) {
			void this.handleRate(rating);
		}
	}

	private handleRevealShortcut(): void {
		const card = this.cards[this.currentIndex];
		if (!card) return;

		if (card.hint && !this.showHint) {
			this.handleShowHint();
			return;
		}

		if (this.isClickRevealClozeCard(card)) {
			return;
		}

		if (!this.showAnswer) {
			this.handleShowAnswer();
		}
	}

	async render(): Promise<void> {
		const lang = t();
		if (this.currentIndex >= this.cards.length) {
			this.completeReview();
			return;
		}

		const card = this.cards[this.currentIndex];
		this.host.setTitle(lang.review.progress(this.currentIndex + 1, this.cards.length));

		this.host.contentEl.empty();
		this.host.buttonsEl.empty();

		const statusTags = getReviewStatusTags(card);
		if (card.tags.length > 0 || statusTags.length > 0) {
			const tagEl = this.host.contentEl.createDiv({ cls: 'er-tags' });
			card.tags.forEach(tag => {
				tagEl.createSpan({
					text: `#${tag}`,
					cls: 'er-tag'
				});
			});
			statusTags.forEach(tag => {
				tagEl.createSpan({
					text: tag.label,
					cls: `er-tag er-status-tag ${tag.cls}`
				});
			});
		}

		const headingPath = buildHeadingPathLabel(card);
		if (headingPath) {
			const headingLink = this.host.contentEl.createEl('a', {
				text: headingPath,
				cls: 'er-heading-path er-heading-path-link'
			});
			headingLink.href = '#';
			headingLink.setAttribute('aria-label', `${headingPath} - ${lang.review.openSource}`);
			headingLink.addEventListener('click', (evt) => {
				evt.preventDefault();
				void this.handleOpenCardSource(card);
			});
		}

		const cardBody = this.host.contentEl.createDiv({ cls: 'er-card-body' });

		const renderContent = card.type === 'cloze'
			? renderClozeContent(card.content, this.showAnswer, this.clickToRevealCloze)
			: renderQAContent(card.question || '', card.answer || '', this.showAnswer);

		const component = new Component();
		await MarkdownRenderer.renderMarkdown(renderContent, cardBody, card.filePath, component);

		if (!this.showAnswer && this.clickToRevealCloze && card.type === 'cloze') {
			this.attachClozeRevealListeners(cardBody);
		}

		if (this.showHint && card.hint) {
			await this.renderHint(card.hint, card.filePath);
		}

		this.renderButtons(card);
	}

	private getDueSortedCards(cards: Card[], maxCardsPerReview?: number): Card[] {
		const now = new Date();
		const dueCards = cards
			.filter(card => !card.schedule || card.schedule.due <= now)
			.sort((a, b) => {
				const isNewA = isNewReviewCard(a);
				const isNewB = isNewReviewCard(b);
				if (isNewA && isNewB) return 0;
				if (isNewA) return 1;
				if (isNewB) return -1;

				const dueA = a.schedule!.due.getTime();
				const dueB = b.schedule!.due.getTime();
				return dueA - dueB;
			});

		if (!maxCardsPerReview || maxCardsPerReview < 1) {
			return dueCards;
		}

		return dueCards.slice(0, Math.floor(maxCardsPerReview));
	}

	private async handleOpenCardSource(card: Card) {
		try {
			const opened = await this.host.openSource(card);
			if (!opened) {
				new Notice(t().notifications.failedToOpenFile, 3000);
			}
		} catch (err) {
			error('Failed to open card source:', err);
			new Notice(t().notifications.failedToOpenFile, 3000);
		}
	}

	private handleShowAnswer() {
		if (this.isClickRevealClozeCard(this.cards[this.currentIndex])) {
			return;
		}

		if (!this.showAnswer) {
			this.showAnswer = true;
			this.showHint = true;
			void this.render();
		}
	}

	private handleShowHint() {
		if (!this.showHint) {
			this.showHint = true;
			void this.render();
		}
	}

	private async renderHint(hint: string, filePath: string) {
		const cardBody = this.host.contentEl.querySelector('.er-card-body');
		if (!cardBody) return;

		const component = new Component();
		await MarkdownRenderer.renderMarkdown(hint, cardBody as HTMLElement, filePath, component);
	}

	private renderButtons(card: Card) {
		const lang = t();
		this.host.buttonsEl.empty();
		const shortcutsActive = this.host.areShortcutsActive?.() ?? true;
		const isClickRevealClozeCard = this.isClickRevealClozeCard(card);
		const hasActiveShortcut = !isClickRevealClozeCard || Boolean(card.hint && !this.showHint);

		if (!Platform.isMobile && !shortcutsActive && hasActiveShortcut) {
			this.host.buttonsEl.createDiv({
				text: lang.review.shortcutsInactive,
				cls: 'er-shortcuts-inactive'
			});
		}

		if (!this.showAnswer) {
			const btnContainer = this.host.buttonsEl.createDiv({ cls: 'er-buttons-row' });

			if (card.hint && !this.showHint) {
				const showHintBtn = btnContainer.createEl('button', {
					cls: 'er-btn-show-hint'
				});
				showHintBtn.createSpan({ text: lang.review.showHint, cls: 'er-btn-label' });
				if (!Platform.isMobile && shortcutsActive) {
					showHintBtn.createSpan({ text: KEYBOARD_SHORTCUTS.REVEAL, cls: 'er-btn-shortcut' });
				}
				showHintBtn.addEventListener('click', () => this.handleShowHint());
			}

			if (isClickRevealClozeCard) {
				const autoRating = this.getCurrentClickRevealRating();
				if (autoRating === null) {
					return;
				}
				const autoButton = getRatingButtons().find(btn => btn.rating === autoRating);
				const showBtn = btnContainer.createEl('button', {
					cls: `er-btn-rating ${autoButton?.cls ?? 'er-btn-show'}`
				});
				showBtn.createSpan({
					text: autoButton?.label ?? lang.review.showAnswer,
					cls: 'er-btn-label'
				});
				if (!Platform.isMobile && shortcutsActive && autoButton) {
					showBtn.createSpan({ text: autoButton.shortcut, cls: 'er-btn-shortcut' });
				}
				showBtn.addEventListener('click', () => this.handleRate(autoRating));
				return;
			}

			const showBtn = btnContainer.createEl('button', {
				cls: 'er-btn-show mod-cta'
			});
			showBtn.createSpan({ text: lang.review.showAnswer, cls: 'er-btn-label' });
			if (!Platform.isMobile && shortcutsActive && (!card.hint || this.showHint)) {
				showBtn.createSpan({ text: KEYBOARD_SHORTCUTS.REVEAL, cls: 'er-btn-shortcut' });
			}
			showBtn.addEventListener('click', () => {
				this.showAnswer = true;
				this.showHint = true;
				void this.render();
			});
			return;
		}

		const btnContainer = this.host.buttonsEl.createDiv({ cls: 'er-rating-buttons er-rating-3' });
		const currentCard = this.cards[this.currentIndex];
		const isDesktop = !Platform.isMobile;

		getRatingButtons().forEach(btn => {
			const buttonEl = btnContainer.createEl('button', {
				cls: `er-btn-rating ${btn.cls}`
			});

			buttonEl.createSpan({ text: btn.label, cls: 'er-btn-label' });
			if (isDesktop && shortcutsActive) {
				buttonEl.createSpan({ text: btn.shortcut, cls: 'er-btn-shortcut' });
			}

			if (isDesktop && currentCard && btn.rating !== 1) {
				const timeText = getNextReviewShortText(currentCard.schedule, btn.rating);
				buttonEl.createSpan({ text: timeText, cls: 'er-btn-time' });
			}

			buttonEl.addEventListener('click', () => this.handleRate(btn.rating));
		});
	}

	private async handleRate(rating: Rating) {
		const card = this.cards[this.currentIndex];
		if (!card) return;

		const newSchedule = calcSchedule(card.schedule ?? null, rating);

		try {
			const file = this.vault.getAbstractFileByPath(card.filePath);
			if (file && file instanceof TFile) {
				await this.vault.process(file, (content) => {
					return injectSchedule(content, newSchedule, card.lineStart, card.scheduleLine);
				});

				const isNewScheduleLine = !card.scheduleLine;
				const lineShift = isNewScheduleLine ? 1 : 0;
				const originalLineStart = card.lineStart;

				// 保存 undo 快照（在修改任何 session 状态之前）
				this.lastRateEntry = {
					cardId: card.id,
					cardIndex: this.currentIndex,
					wasAgain: rating === 1,
					originalSchedule: card.schedule ? { ...card.schedule } : undefined,
					originalScheduleLine: card.scheduleLine,
					originalLineStart: card.lineStart,
					originalLineEnd: card.lineEnd,
					affectedCards: this.cards
						.filter(queueCard => queueCard.id !== card.id && queueCard.filePath === card.filePath && queueCard.lineStart >= originalLineStart)
						.map(queueCard => ({
							cardId: queueCard.id,
							lineStart: queueCard.lineStart,
							lineEnd: queueCard.lineEnd,
							scheduleLine: queueCard.scheduleLine,
						})),
				};

				card.schedule = newSchedule;
				if (isNewScheduleLine) {
					card.scheduleLine = card.lineStart - 1;
					card.lineStart += 1;
					card.lineEnd += 1;
				}

				for (const queueCard of this.cards) {
					if (queueCard.id === card.id) continue;

					if (queueCard.filePath === card.filePath && queueCard.lineStart >= originalLineStart) {
						queueCard.lineStart += lineShift;
						queueCard.lineEnd += lineShift;
						if (queueCard.scheduleLine !== undefined) {
							queueCard.scheduleLine += lineShift;
						}
					}
				}
			} else {
				this.lastRateEntry = null;
			}

			if (rating === 1) {
				const currentCard = this.cards[this.currentIndex];
				this.cards.splice(this.currentIndex, 1);
				this.cards.push(currentCard);
				this.resetRevealState(card.id);

				if (this.currentIndex >= this.cards.length) {
					this.currentIndex = 0;
				}

				void this.render();
				return;
			}

			this.completedCardIds.add(card.id);
			this.resetRevealState(card.id);
			this.currentIndex++;
			void this.render();
		} catch (err) {
			this.lastRateEntry = null;
			error('Failed to update schedule:', err);
			new Notice(t().notifications.failedToSave, 3000);
		}
	}

	async undo(): Promise<void> {
		if (!this.lastRateEntry) return;

		const entry = this.lastRateEntry;
		this.lastRateEntry = null;

		const card = this.cards.find(c => c.id === entry.cardId);
		if (!card) return;

		try {
			const file = this.vault.getAbstractFileByPath(card.filePath);
			if (file && file instanceof TFile) {
				await this.vault.process(file, (content) => {
					if (entry.originalSchedule) {
						return injectSchedule(content, entry.originalSchedule, entry.originalLineStart, entry.originalScheduleLine);
					} else {
						return deleteScheduleLine(content, entry.originalLineStart);
					}
				});
			}

			// 恢复 affected cards 的行号
			for (const snapshot of entry.affectedCards) {
				const affectedCard = this.cards.find(c => c.id === snapshot.cardId);
				if (affectedCard) {
					affectedCard.lineStart = snapshot.lineStart;
					affectedCard.lineEnd = snapshot.lineEnd;
					affectedCard.scheduleLine = snapshot.scheduleLine;
				}
			}

			// 恢复被评分卡片
			card.schedule = entry.originalSchedule;
			card.scheduleLine = entry.originalScheduleLine;
			card.lineStart = entry.originalLineStart;
			card.lineEnd = entry.originalLineEnd;

			if (entry.wasAgain) {
				const currentIndex = this.cards.findIndex(c => c.id === entry.cardId);
				if (currentIndex !== -1) {
					this.cards.splice(currentIndex, 1);
					this.cards.splice(entry.cardIndex, 0, card);
				}
			} else {
				this.completedCardIds.delete(card.id);
			}

			this.currentIndex = entry.cardIndex;
			this.resetRevealState(card.id);
			void this.render();
		} catch (err) {
			error('Failed to undo rating:', err);
			new Notice(t().notifications.undoFailed, 3000);
		}
	}

	private attachClozeRevealListeners(cardBody: HTMLElement): void {
		const items = cardBody.querySelectorAll('.er-cloze-reveal-item');
		const card = this.cards[this.currentIndex];
		if (!card) return;

		const states = this.ensureClozeRevealStates(card.id, items.length);
		items.forEach(item => {
			const el = item as HTMLElement;
			const index = Number(el.getAttribute('data-cloze-index'));
			if (!Number.isInteger(index) || index < 0 || index >= states.length) {
				return;
			}

			this.applyClozeRevealState(el, states[index]);
			const cycle = () => {
				states[index] = this.getNextClozeRevealState(states[index]);
				this.applyClozeRevealState(el, states[index]);
				this.renderButtons(card);
			};
			el.addEventListener('click', cycle);
			el.addEventListener('keydown', (evt: KeyboardEvent) => {
				if (evt.key === 'Enter' || evt.key === ' ') {
					evt.preventDefault();
					cycle();
				}
			});
		});
	}

	private isClickRevealClozeCard(card: Card | undefined): boolean {
		return this.clickToRevealCloze && card?.type === 'cloze' && !this.showAnswer;
	}

	private ensureClozeRevealStates(cardId: string, count: number): ClozeRevealState[] {
		const states = this.clozeRevealStatesByCardId.get(cardId) ?? [];
		while (states.length < count) {
			states.push('hidden');
		}
		if (states.length > count) {
			states.length = count;
		}
		this.clozeRevealStatesByCardId.set(cardId, states);
		return states;
	}

	private getNextClozeRevealState(state: ClozeRevealState): ClozeRevealState {
		if (state === 'hidden') return 'shown';
		if (state === 'shown') return 'deleted';
		return 'hidden';
	}

	private applyClozeRevealState(el: HTMLElement, state: ClozeRevealState): void {
		el.classList.remove('er-cloze-hidden');
		el.classList.remove('er-cloze-show');
		el.classList.remove('er-cloze-deleted');
		el.classList.add(state === 'shown' ? 'er-cloze-show' : `er-cloze-${state}`);
		el.setAttribute('data-cloze-state', state);
	}

	private getCurrentClickRevealRating(): Rating | null {
		const card = this.cards[this.currentIndex];
		if (!this.isClickRevealClozeCard(card)) {
			return null;
		}

		const stats = this.getClozeRevealStats(card.id);
		if (!stats || stats.total === 0 || stats.hidden > 0) {
			return null;
		}

		const shownPercent = (stats.shown / stats.total) * 100;
		if (shownPercent >= this.clickToRevealGoodThreshold) {
			return 3;
		}
		if (shownPercent >= this.clickToRevealHardThreshold) {
			return 2;
		}
		return 1;
	}

	private getClozeRevealStats(cardId: string): ClozeRevealStats | null {
		const states = this.clozeRevealStatesByCardId.get(cardId);
		if (!states) {
			return null;
		}

		return states.reduce<ClozeRevealStats>((stats, state) => {
			stats.total += 1;
			stats[state] += 1;
			return stats;
		}, { total: 0, hidden: 0, shown: 0, deleted: 0 });
	}

	private resetRevealState(cardId?: string): void {
		if (cardId) {
			this.clozeRevealStatesByCardId.delete(cardId);
		}
		this.showAnswer = false;
		this.showHint = false;
	}

	private completeReview() {
		if (this.isComplete) return;
		this.isComplete = true;
		const remainingDueCount = this.getDueSortedCards(this.sourceCards)
			.filter(card => !this.completedCardIds.has(card.id))
			.length;
		this.host.complete({ remainingDueCount });
	}
}
