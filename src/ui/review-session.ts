import { App, MarkdownRenderer, TFile, Vault, Component, Notice, Platform, MarkdownView, Scope, KeymapEventHandler } from 'obsidian';
import { Card, Rating, Schedule } from '../types';
import { calcSchedule, getNextReviewShortText } from '../scheduler';
import { getRatingButtons, KEYBOARD_SHORTCUTS } from '../config/constants';
import { injectScheduleWithResult, revertScheduleMutation, ScheduleMutation } from '../store';
import { renderClozeContent, renderQAContent } from '../parser';
import { error } from '../utils/';
import { t } from '../i18n';

export interface ReviewOptions {
	cards: Card[];
	vault: Vault;
	maxCardsPerReview?: number;
	reloadCards?: () => Promise<Card[]>;
	onComplete?: () => void;
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
}

interface ReviewStatusTag {
	label: string;
	cls: string;
}

interface ReviewSessionSnapshot {
	sourceCards: Card[];
	cards: Card[];
	completedCardIds: string[];
	currentIndex: number;
	showAnswer: boolean;
	showHint: boolean;
}

interface RatingUndoState {
	session: ReviewSessionSnapshot;
	fileMutation?: {
		filePath: string;
		mutation: ScheduleMutation;
	};
}

const SHAKE_UNDO_THRESHOLD = 18;
const SHAKE_UNDO_COOLDOWN_MS = 1200;
const SHAKE_NOTICE_COOLDOWN_MS = 2000;

function cloneSchedule(schedule: Schedule | undefined): Schedule | undefined {
	if (!schedule) {
		return undefined;
	}

	return {
		...schedule,
		due: new Date(schedule.due),
	};
}

function cloneCard(card: Card): Card {
	return {
		...card,
		tags: [...card.tags],
		schedule: cloneSchedule(card.schedule),
		headingPath: card.headingPath ? [...card.headingPath] : undefined,
	};
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
	private sourceCards: Card[];
	private cards: Card[];
	private completedCardIds: Set<string> = new Set();
	private currentIndex: number = 0;
	private showAnswer: boolean = false;
	private showHint: boolean = false;
	private isComplete: boolean = false;
	private shortcutScope: Scope | null = null;
	private shortcutHandlers: KeymapEventHandler[] = [];
	private lastRatingUndo: RatingUndoState | null = null;
	private deviceMotionRegistered: boolean = false;
	private deviceMotionPermissionRequested: boolean = false;
	private lastMotionMagnitude: number | null = null;
	private lastShakeUndoAt: number = 0;
	private lastShakeNoticeAt: number = 0;

	constructor(app: App, options: ReviewOptions, host: ReviewSessionHost) {
		this.app = app;
		this.vault = options.vault;
		this.host = host;
		this.sourceCards = options.cards;
		this.cards = this.getDueSortedCards(options.cards, options.maxCardsPerReview);
		this.registerShakeUndo();
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

		if (key && key.toLowerCase() === KEYBOARD_SHORTCUTS.UNDO.toLowerCase()) {
			evt.preventDefault();
			this.undoLastRatingAction();
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
		this.unregisterShakeUndo();
	}

	showAnswerAction(): void {
		this.handleShowAnswer();
	}

	rateAction(rating: Rating): void {
		if (this.showAnswer) {
			void this.handleRate(rating);
		}
	}

	undoLastRatingAction(showSuccessNotice: boolean = false): void {
		if (this.lastRatingUndo) {
			void this.handleUndoLastRating(showSuccessNotice);
		}
	}

	private registerShakeUndo(skipPermissionCheck: boolean = false): void {
		if (!Platform.isMobile || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
			return;
		}

		if (this.deviceMotionRegistered) {
			return;
		}

		if (!skipPermissionCheck && this.requiresDeviceMotionPermission()) {
			return;
		}

		window.addEventListener('devicemotion', this.handleDeviceMotion);
		this.deviceMotionRegistered = true;
	}

	private ensureShakeUndoPermission(): void {
		if (!Platform.isMobile || this.deviceMotionRegistered || this.deviceMotionPermissionRequested) {
			return;
		}

		const deviceMotionEvent = (globalThis as unknown as {
			DeviceMotionEvent?: {
				requestPermission?: () => Promise<'granted' | 'denied'>;
			};
		}).DeviceMotionEvent;

		if (typeof deviceMotionEvent?.requestPermission !== 'function') {
			this.registerShakeUndo();
			return;
		}

		this.deviceMotionPermissionRequested = true;
		void deviceMotionEvent.requestPermission()
			.then((permission) => {
				if (permission === 'granted') {
					this.registerShakeUndo(true);
					return;
				}

				new Notice(t().notifications.shakePermissionDenied, 3000);
			})
			.catch(() => {
				new Notice(t().notifications.shakePermissionDenied, 3000);
			});
	}

	private requiresDeviceMotionPermission(): boolean {
		const deviceMotionEvent = (globalThis as unknown as {
			DeviceMotionEvent?: {
				requestPermission?: () => Promise<'granted' | 'denied'>;
			};
		}).DeviceMotionEvent;
		return typeof deviceMotionEvent?.requestPermission === 'function';
	}

	private unregisterShakeUndo(): void {
		if (!this.deviceMotionRegistered || typeof window === 'undefined' || typeof window.removeEventListener !== 'function') {
			return;
		}

		window.removeEventListener('devicemotion', this.handleDeviceMotion);
		this.deviceMotionRegistered = false;
		this.lastMotionMagnitude = null;
	}

	private handleDeviceMotion = (evt: DeviceMotionEvent): void => {
		const acceleration = evt.accelerationIncludingGravity ?? evt.acceleration;
		if (!acceleration) {
			return;
		}

		const x = acceleration.x ?? 0;
		const y = acceleration.y ?? 0;
		const z = acceleration.z ?? 0;
		const magnitude = Math.sqrt(x * x + y * y + z * z);
		const previousMagnitude = this.lastMotionMagnitude;
		this.lastMotionMagnitude = magnitude;
		if (previousMagnitude === null) {
			return;
		}

		const now = Date.now();
		const delta = Math.abs(magnitude - previousMagnitude);
		if (delta >= SHAKE_UNDO_THRESHOLD && now - this.lastShakeUndoAt >= SHAKE_UNDO_COOLDOWN_MS) {
			this.lastShakeUndoAt = now;
			if (this.lastRatingUndo) {
				this.undoLastRatingAction(true);
				return;
			}

			if (now - this.lastShakeNoticeAt >= SHAKE_NOTICE_COOLDOWN_MS) {
				this.lastShakeNoticeAt = now;
				new Notice(t().notifications.shakeUndoUnavailable, 1500);
			}
		}
	};

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
		this.ensureShakeUndoPermission();
		if (!this.showAnswer) {
			this.showAnswer = true;
			this.showHint = true;
			void this.render();
		}
	}

	private handleShowHint() {
		this.ensureShakeUndoPermission();
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
				if (!Platform.isMobile && shortcutsActive) {
					showHintBtn.createSpan({ text: KEYBOARD_SHORTCUTS.REVEAL, cls: 'obr-btn-shortcut' });
				}
				showHintBtn.addEventListener('click', () => this.handleShowHint());
			}

			const showBtn = btnContainer.createEl('button', {
				cls: 'obr-btn-show mod-cta'
			});
			showBtn.createSpan({ text: lang.review.showAnswer, cls: 'obr-btn-label' });
			if (!Platform.isMobile && shortcutsActive && (!card.hint || this.showHint)) {
				showBtn.createSpan({ text: KEYBOARD_SHORTCUTS.REVEAL, cls: 'obr-btn-shortcut' });
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
			if (isDesktop && shortcutsActive) {
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
		this.ensureShakeUndoPermission();
		const card = this.cards[this.currentIndex];
		if (!card) return;

		const newSchedule = calcSchedule(card.schedule ?? null, rating);
		const undoSession = this.createSessionSnapshot();
		let fileMutation: RatingUndoState['fileMutation'];

		try {
			const file = this.vault.getAbstractFileByPath(card.filePath);
			if (file && file instanceof TFile) {
				await this.vault.process(file, (content) => {
					const result = injectScheduleWithResult(content, newSchedule, card.lineStart, card.scheduleLine);
					fileMutation = {
						filePath: card.filePath,
						mutation: result.mutation,
					};
					return result.text;
				});

				const isNewScheduleLine = card.scheduleLine === undefined;
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

			this.lastRatingUndo = {
				session: undoSession,
				fileMutation,
			};

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
			this.completedCardIds.add(card.id);
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

	private createSessionSnapshot(): ReviewSessionSnapshot {
		return {
			sourceCards: this.sourceCards.map(cloneCard),
			cards: this.cards.map(cloneCard),
			completedCardIds: [...this.completedCardIds],
			currentIndex: this.currentIndex,
			showAnswer: this.showAnswer,
			showHint: this.showHint,
		};
	}

	private restoreSessionSnapshot(snapshot: ReviewSessionSnapshot): void {
		this.sourceCards = snapshot.sourceCards.map(cloneCard);
		this.cards = snapshot.cards.map(cloneCard);
		this.completedCardIds = new Set(snapshot.completedCardIds);
		this.currentIndex = snapshot.currentIndex;
		this.showAnswer = true;
		this.showHint = snapshot.showHint;
		this.isComplete = false;
	}

	private async handleUndoLastRating(showSuccessNotice: boolean = false): Promise<void> {
		const undo = this.lastRatingUndo;
		if (!undo) return;

		try {
			if (undo.fileMutation) {
				const file = this.vault.getAbstractFileByPath(undo.fileMutation.filePath);
				if (!(file instanceof TFile)) {
					new Notice(t().notifications.failedToUndo, 4000);
					return;
				}

				let reverted = false;
				await this.vault.process(file, (content) => {
					const result = revertScheduleMutation(content, undo.fileMutation!.mutation);
					reverted = result.reverted;
					return result.text;
				});

				if (!reverted) {
					new Notice(t().notifications.failedToUndo, 4000);
					return;
				}
			}

			this.restoreSessionSnapshot(undo.session);
			this.lastRatingUndo = null;
			await this.render();
			if (showSuccessNotice) {
				new Notice(t().notifications.shakeUndoComplete, 1200);
			}
		} catch (err) {
			error('Failed to undo rating:', err);
			new Notice(t().notifications.failedToUndo, 4000);
		}
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
