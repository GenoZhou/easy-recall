import { App, MarkdownRenderer, TFile, Vault, Component, Notice, Platform, MarkdownView, Scope, KeymapEventHandler } from 'obsidian';
import { Card, Rating } from '../types';
import { calcSchedule, getNextReviewShortText } from '../scheduler';
import { getRatingButtons, KEYBOARD_SHORTCUTS } from '../config/constants';
import { injectSchedule } from '../store';
import { renderClozeContent, renderQAContent } from '../parser';
import { error } from '../utils/';
import { t } from '../i18n';

export interface ReviewOptions {
	cards: Card[];
	vault: Vault;
	maxCardsPerReview?: number;
	onComplete?: () => void;
	hideReviewPathHiddenWords?: boolean;
}

export interface ReviewSessionHost {
	contentEl: HTMLElement;
	buttonsEl: HTMLElement;
	setTitle(title: string): void;
	complete(): void;
	openSource(card: Card): Promise<boolean>;
	areShortcutsActive?(): boolean;
}

interface ReviewStatusTag {
	label: string;
	cls: string;
}

function isNewReviewCard(card: Card): boolean {
	return !card.schedule || card.schedule.reps === 0;
}

export function buildHeadingPathLabel(card: Card): string | null {
	if (!card.headingPath?.length) {
		return null;
	}

	const fileName = card.filePath.split('/').pop()?.replace(/\.md$/i, '') || card.filePath;
	const parts = [fileName, ...card.headingPath];
	return parts.join(' / ');
}

export function buildVisibleHeadingPathLabel(
	card: Card,
	showAnswer: boolean,
	hideReviewPathHiddenWords: boolean
): string | null {
	const headingPath = buildHeadingPathLabel(card);
	if (!headingPath || showAnswer || !hideReviewPathHiddenWords) {
		return headingPath;
	}

	const hiddenTerms = getHiddenPathTerms(card);
	if (hiddenTerms.length === 0) {
		return headingPath;
	}

	return hiddenTerms.reduce((label, term) => label.split(term).join('[...]'), headingPath);
}

function getHiddenPathTerms(card: Card): string[] {
	const terms = new Set<string>();

	if (card.type === 'cloze') {
		const clozeRegex = /==(.+?)==/g;
		let match: RegExpExecArray | null;
		while ((match = clozeRegex.exec(card.content)) !== null) {
			const term = match[1].trim();
			if (term) {
				terms.add(term);
			}
		}
	}

	if (card.type === 'qa') {
		const answer = card.answer?.trim();
		if (answer) {
			terms.add(answer);
		}
	}

	return Array.from(terms).sort((a, b) => b.length - a.length);
}

export function getReviewStatusTags(card: Card): ReviewStatusTag[] {
	const lang = t();
	const statusTags: ReviewStatusTag[] = [];

	if (isNewReviewCard(card)) {
		statusTags.push({
			label: lang.review.statusTags.newCard,
			cls: 'obr-status-tag-new',
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
	private cards: Card[];
	private currentIndex: number = 0;
	private showAnswer: boolean = false;
	private showHint: boolean = false;
	private isComplete: boolean = false;
	private shortcutScope: Scope | null = null;
	private shortcutHandlers: KeymapEventHandler[] = [];
	private hideReviewPathHiddenWords: boolean;

	constructor(app: App, options: ReviewOptions, host: ReviewSessionHost) {
		this.app = app;
		this.vault = options.vault;
		this.host = host;
		this.cards = this.getDueSortedCards(options.cards, options.maxCardsPerReview);
		this.hideReviewPathHiddenWords = options.hideReviewPathHiddenWords ?? true;
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
	}

	handleShortcutEvent(evt: KeyboardEvent, fallbackKey?: string): boolean {
		if (Platform.isMobile) {
			return true;
		}

		if (this.shouldIgnoreShortcutEvent(evt)) {
			return true;
		}

		const key = evt.key || fallbackKey;

		if (key === KEYBOARD_SHORTCUTS.REVEAL || key === ' ') {
			evt.preventDefault();
			if (!evt.repeat) {
				this.handleRevealShortcut();
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
	}

	showAnswerAction(): void {
		this.handleShowAnswer();
	}

	rateAction(rating: Rating): void {
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
			const tagEl = this.host.contentEl.createDiv({ cls: 'obr-tags' });
			card.tags.forEach(tag => {
				tagEl.createSpan({
					text: `#${tag}`,
					cls: 'obr-tag'
				});
			});
			statusTags.forEach(tag => {
				tagEl.createSpan({
					text: tag.label,
					cls: `obr-tag obr-status-tag ${tag.cls}`
				});
			});
		}

		const headingPath = buildVisibleHeadingPathLabel(card, this.showAnswer, this.hideReviewPathHiddenWords);
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
		const cardBody = this.host.contentEl.querySelector('.obr-card-body');
		if (!cardBody) return;

		const component = new Component();
		await MarkdownRenderer.renderMarkdown(hint, cardBody as HTMLElement, filePath, component);
	}

	private renderButtons(card: Card) {
		const lang = t();
		this.host.buttonsEl.empty();
		const shortcutsActive = this.host.areShortcutsActive?.() ?? true;

		if (!Platform.isMobile && !shortcutsActive) {
			this.host.buttonsEl.createDiv({
				text: lang.review.shortcutsInactive,
				cls: 'obr-shortcuts-inactive'
			});
		}

		if (!this.showAnswer) {
			const btnContainer = this.host.buttonsEl.createDiv({ cls: 'obr-buttons-row' });

			if (card.hint && !this.showHint) {
				const showHintBtn = btnContainer.createEl('button', {
					cls: 'obr-btn-show-hint'
				});
				showHintBtn.createSpan({ text: lang.review.showHint, cls: 'obr-btn-label' });
				if (!Platform.isMobile) {
					showHintBtn.createSpan({ text: KEYBOARD_SHORTCUTS.REVEAL, cls: this.getShortcutClass(shortcutsActive) });
				}
				showHintBtn.addEventListener('click', () => this.handleShowHint());
			}

			const showBtn = btnContainer.createEl('button', {
				cls: 'obr-btn-show mod-cta'
			});
			showBtn.createSpan({ text: lang.review.showAnswer, cls: 'obr-btn-label' });
			if (!Platform.isMobile && (!card.hint || this.showHint)) {
				showBtn.createSpan({ text: KEYBOARD_SHORTCUTS.REVEAL, cls: this.getShortcutClass(shortcutsActive) });
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
			const buttonEl = btnContainer.createEl('button', {
				cls: `obr-btn-rating ${btn.cls}`
			});

			buttonEl.createSpan({ text: btn.label, cls: 'obr-btn-label' });
			if (isDesktop) {
				buttonEl.createSpan({ text: btn.shortcut, cls: this.getShortcutClass(shortcutsActive) });
			}

			if (isDesktop && currentCard && btn.rating !== 1) {
				const timeText = getNextReviewShortText(currentCard.schedule, btn.rating);
				buttonEl.createSpan({ text: timeText, cls: 'obr-btn-time' });
			}

			buttonEl.addEventListener('click', () => this.handleRate(btn.rating));
		});
	}

	private getShortcutClass(active: boolean): string {
		return active ? 'obr-btn-shortcut' : 'obr-btn-shortcut obr-btn-shortcut-inactive';
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
	}

	private completeReview() {
		if (this.isComplete) return;
		this.isComplete = true;
		this.host.complete();
	}
}
