import { App, MarkdownRenderer, TFile, Vault, Component, Notice, Platform, MarkdownView, Scope, KeymapEventHandler } from 'obsidian';
import { Card, Rating } from '../types';
import { calcSchedule, getNextReviewShortText } from '../scheduler';
import { ENTER_RATING_COOLDOWN_MS, getRatingButtons, KEYBOARD_SHORTCUTS } from '../config/constants';
import { injectSchedule } from '../store';
import { renderClozeContent, renderQAContent } from '../parser';
import { error } from '../utils/';
import { t } from '../i18n';

export interface ReviewOptions {
	cards: Card[];
	vault: Vault;
	onComplete?: () => void;
}

export interface ReviewSessionHost {
	contentEl: HTMLElement;
	buttonsEl: HTMLElement;
	setTitle(title: string): void;
	complete(): void;
	openSource(card: Card): Promise<boolean>;
}

export function buildHeadingPathLabel(card: Card): string | null {
	if (!card.headingPath?.length) {
		return null;
	}

	const fileName = card.filePath.split('/').pop()?.replace(/\.md$/i, '') || card.filePath;
	const parts = [fileName, ...card.headingPath];
	return parts.join(' / ');
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
	private cards: Card[];
	private currentIndex: number = 0;
	private showAnswer: boolean = false;
	private showHint: boolean = false;
	private isComplete: boolean = false;
	private enterRatingCooldownUntil: number = 0;
	private enterRatingCooldownTimer: ReturnType<typeof setTimeout> | null = null;
	private shortcutScope: Scope | null = null;
	private shortcutHandlers: KeymapEventHandler[] = [];

	constructor(app: App, options: ReviewOptions, host: ReviewSessionHost) {
		this.app = app;
		this.vault = options.vault;
		this.host = host;
		this.cards = this.getDueSortedCards(options.cards);
	}

	registerShortcuts(scope: Scope): void {
		if (Platform.isMobile) {
			return;
		}

		this.unregisterShortcuts();
		this.shortcutScope = scope;

		this.shortcutHandlers.push(scope.register([], KEYBOARD_SHORTCUTS.SHOW_ANSWER, (evt: KeyboardEvent) => {
			return this.handleShortcutEvent(evt, KEYBOARD_SHORTCUTS.SHOW_ANSWER);
		}));

		KEYBOARD_SHORTCUTS.RATINGS.forEach(shortcut => {
			this.shortcutHandlers.push(scope.register([], shortcut, (evt: KeyboardEvent) => {
				return this.handleShortcutEvent(evt, shortcut);
			}));
		});
	}

	handleShortcutEvent(evt: KeyboardEvent, fallbackKey?: string): boolean {
		if (Platform.isMobile) {
			return true;
		}

		if (this.shouldIgnoreShortcutEvent(evt)) {
			return true;
		}

		const key = evt.key || fallbackKey;

		if (key === KEYBOARD_SHORTCUTS.SHOW_ANSWER) {
			evt.preventDefault();
			if (!evt.repeat) {
				this.handleEnterShortcut();
			}
			return false;
		}

		const ratingShortcut = KEYBOARD_SHORTCUTS.RATINGS.find(shortcut => shortcut === key);
		if (ratingShortcut) {
			evt.preventDefault();
			this.rateAction(Number(ratingShortcut) as Rating);
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
		this.clearEnterRatingCooldown();
	}

	showAnswerAction(): void {
		this.handleShowAnswer(false);
	}

	rateAction(rating: Rating): void {
		if (this.showAnswer) {
			void this.handleRate(rating);
		}
	}

	private handleEnterShortcut(): void {
		if (!this.showAnswer) {
			this.handleShowAnswer(true);
			return;
		}

		if (this.isEnterRatingCoolingDown()) {
			return;
		}

		void this.handleRate(3);
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

		if (card.tags.length > 0) {
			const tagEl = this.host.contentEl.createDiv({ cls: 'obr-tags' });
			card.tags.forEach(tag => {
				tagEl.createSpan({
					text: `#${tag}`,
					cls: 'obr-tag'
				});
			});
		}

		const headingPath = buildHeadingPathLabel(card);
		if (headingPath) {
			const headingLink = this.host.contentEl.createEl('a', {
				text: headingPath,
				cls: 'obr-heading-path obr-heading-path-link'
			});
			headingLink.href = '#';
			headingLink.setAttribute('aria-label', `${headingPath} - ${lang.review.openSource}`);
			headingLink.addEventListener('click', (evt) => {
				evt.preventDefault();
				void this.handleOpenCardSource(card);
			});
		}

		const cardBody = this.host.contentEl.createDiv({ cls: 'obr-card-body' });

		const renderContent = card.type === 'cloze'
			? renderClozeContent(card.content, this.showAnswer)
			: renderQAContent(card.question || '', card.answer || '', this.showAnswer);

		const component = new Component();
		await MarkdownRenderer.renderMarkdown(renderContent, cardBody, card.filePath, component);

		if (this.showHint && card.hint) {
			await this.renderHint(card.hint, card.filePath);
		}

		this.renderButtons(card);
	}

	private getDueSortedCards(cards: Card[]): Card[] {
		const now = new Date();
		return cards
			.filter(card => !card.schedule || card.schedule.due <= now)
			.sort((a, b) => {
				const dueA = a.schedule?.due?.getTime() || 0;
				const dueB = b.schedule?.due?.getTime() || 0;
				return dueA - dueB;
			});
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

	private handleShowAnswer(startEnterCooldown: boolean = false) {
		if (!this.showAnswer) {
			this.showAnswer = true;
			this.showHint = true;
			if (startEnterCooldown) {
				this.startEnterRatingCooldown();
			}
			void this.render();
		}
	}

	private startEnterRatingCooldown(): void {
		this.clearEnterRatingCooldownTimer();
		this.enterRatingCooldownUntil = Date.now() + ENTER_RATING_COOLDOWN_MS;
		this.enterRatingCooldownTimer = setTimeout(() => {
			this.enterRatingCooldownUntil = 0;
			this.enterRatingCooldownTimer = null;
			void this.render();
		}, ENTER_RATING_COOLDOWN_MS);
	}

	private isEnterRatingCoolingDown(): boolean {
		return this.enterRatingCooldownUntil > Date.now();
	}

	private clearEnterRatingCooldown(): void {
		this.enterRatingCooldownUntil = 0;
		this.clearEnterRatingCooldownTimer();
	}

	private clearEnterRatingCooldownTimer(): void {
		if (this.enterRatingCooldownTimer) {
			clearTimeout(this.enterRatingCooldownTimer);
			this.enterRatingCooldownTimer = null;
		}
	}

	private handleShowHint() {
		if (!this.showHint) {
			this.showHint = true;
			void this.render();
		}
	}

	private async renderHint(hint: string, filePath: string) {
		const cardBody = this.host.contentEl.querySelector('.obr-card-body');
		if (!cardBody) return;

		const component = new Component();
		await MarkdownRenderer.renderMarkdown(hint, cardBody as HTMLElement, filePath, component);
	}

	private renderButtons(card: Card) {
		const lang = t();
		this.host.buttonsEl.empty();

		if (!this.showAnswer) {
			const btnContainer = this.host.buttonsEl.createDiv({ cls: 'obr-buttons-row' });

			if (card.hint && !this.showHint) {
				const showHintBtn = btnContainer.createEl('button', {
					text: lang.review.showHint,
					cls: 'obr-btn-show-hint'
				});
				showHintBtn.addEventListener('click', () => this.handleShowHint());
			}

			const showBtn = btnContainer.createEl('button', {
				cls: 'obr-btn-show mod-cta'
			});
			showBtn.createSpan({ text: lang.review.showAnswer, cls: 'obr-btn-label' });
			if (!Platform.isMobile) {
				showBtn.createSpan({ text: KEYBOARD_SHORTCUTS.SHOW_ANSWER, cls: 'obr-btn-shortcut' });
			}
			showBtn.addEventListener('click', () => {
				this.showAnswer = true;
				this.showHint = true;
				void this.render();
			});
			return;
		}

		const btnContainer = this.host.buttonsEl.createDiv({ cls: 'obr-rating-buttons obr-rating-3' });
		const currentCard = this.cards[this.currentIndex];
		const isDesktop = !Platform.isMobile;

		getRatingButtons().forEach(btn => {
			const isGoodCooling = btn.rating === 3 && this.isEnterRatingCoolingDown();
			const buttonEl = btnContainer.createEl('button', {
				cls: `obr-btn-rating ${btn.cls}${isGoodCooling ? ' is-enter-cooling' : ''}`
			});

			buttonEl.createSpan({ text: btn.label, cls: 'obr-btn-label' });
			if (isDesktop) {
				buttonEl.createSpan({ text: btn.shortcut, cls: 'obr-btn-shortcut' });
			}

			if (isDesktop && currentCard && btn.rating !== 1) {
				const timeText = getNextReviewShortText(currentCard.schedule, btn.rating);
				buttonEl.createSpan({ text: timeText, cls: 'obr-btn-time' });
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
			}

			if (rating === 1) {
				const currentCard = this.cards[this.currentIndex];
				this.cards.splice(this.currentIndex, 1);
				this.cards.push(currentCard);
				this.resetRevealState();

				if (this.currentIndex >= this.cards.length) {
					this.currentIndex = 0;
				}

				void this.render();
				return;
			}

			this.currentIndex++;
			this.resetRevealState();
			void this.render();
		} catch (err) {
			error('Failed to update schedule:', err);
			new Notice(t().notifications.failedToSave, 3000);
		}
	}

	private resetRevealState(): void {
		this.showAnswer = false;
		this.showHint = false;
		this.clearEnterRatingCooldown();
	}

	private completeReview() {
		if (this.isComplete) return;
		this.clearEnterRatingCooldown();
		this.isComplete = true;
		this.host.complete();
	}
}
