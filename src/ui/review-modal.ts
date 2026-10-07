import { App, Modal, Vault } from 'obsidian';
import { Card } from '../types';
import { t } from '../i18n';
import { mountReviewHeader, ReviewHeaderControls } from './review-header';
import {
	ReviewCompletionState,
	ReviewOptions,
	ReviewSession,
	buildHeadingPathLabel,
	openCardSource,
} from './review-session';

export type ReviewModalOptions = ReviewOptions;

export { buildHeadingPathLabel, openCardSource };

export class ReviewModal extends Modal {
	private cards: Card[];
	private vault: Vault;
	private maxCardsPerReview?: number;
	private reloadCards?: () => Promise<Card[]>;
	private onComplete?: () => void;
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;
	private header: ReviewHeaderControls | null = null;
	private session: ReviewSession | null = null;
	private shouldTriggerComplete: boolean = true;
	private completionState: ReviewCompletionState | null = null;
	private completionNotified: boolean = false;
	private clickToRevealCloze: boolean = false;
	private enableUndo: boolean = false;
	private includeNotDue: boolean = false;

	constructor(app: App, options: ReviewModalOptions) {
		super(app);
		this.cards = options.cards;
		this.vault = options.vault;
		this.maxCardsPerReview = options.maxCardsPerReview;
		this.reloadCards = options.reloadCards;
		this.onComplete = options.onComplete;
		this.clickToRevealCloze = options.clickToRevealCloze ?? false;
		this.enableUndo = options.enableUndo ?? false;
		this.includeNotDue = options.includeNotDue ?? false;
	}

	onOpen() {
		const { contentEl, modalEl } = this;

		// Host class is on modalEl so header/title rules can reach titleEl
		// (titleEl is a sibling of contentEl, not a descendant).
		modalEl.addClass('er-review-modal-host');
		contentEl.addClass('er-review-modal');
		this.cardContentEl = contentEl.createDiv({ cls: 'er-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'er-buttons' });

		this.startSession();
	}

	private startSession(): void {
		if (!this.cardContentEl || !this.buttonsContainerEl) {
			return;
		}

		this.completionState = null;
		this.session?.dispose();
		this.header = mountReviewHeader(this.titleEl, {
			enableUndo: this.enableUndo,
			onUndo: () => {
				void this.session?.undo();
			},
		});
		this.session = new ReviewSession(this.app, {
			cards: this.cards,
			vault: this.vault,
			maxCardsPerReview: this.maxCardsPerReview,
			reloadCards: this.reloadCards,
			onComplete: this.onComplete,
			clickToRevealCloze: this.clickToRevealCloze,
			enableUndo: this.enableUndo,
			includeNotDue: this.includeNotDue,
		}, {
			contentEl: this.cardContentEl,
			buttonsEl: this.buttonsContainerEl,
			setHeader: (state) => this.header?.setHeader(state),
			complete: (state) => this.renderComplete(state),
			openSource: async (card) => {
				const opened = await openCardSource(this.app, this.vault, card);
				if (opened) {
					this.shouldTriggerComplete = false;
					this.close();
				}
				return opened;
			},
			handleCompleteSpace: () => {
				if (this.completionState && this.completionState.remainingDueCount > 0) {
					void this.reloadAndStartSession();
				} else {
					this.notifyComplete();
					this.close();
				}
			},
			onUndoFromComplete: () => {
				this.completionState = null;
			},
		});
		// Modals own keyboard focus in Obsidian, so Scope is reliable here.
		this.session.registerShortcuts(this.scope);
		void this.session.render();
	}

	private renderComplete(state: ReviewCompletionState): void {
		const lang = t();
		this.completionState = state;
		this.cardContentEl?.empty();
		this.buttonsContainerEl?.empty();
		this.header?.setHeader({
			title: lang.review.complete.title,
			canUndo: this.session?.canUndo() ?? false,
		});
		this.cardContentEl?.createEl('p', { text: lang.notifications.reviewComplete });

		if (state.remainingDueCount > 0) {
			this.cardContentEl?.createEl('p', {
				text: lang.review.complete.remaining(state.remainingDueCount),
				cls: 'er-review-complete-remaining',
			});
		}

		const buttonRow = this.buttonsContainerEl?.createDiv({ cls: 'er-buttons-row' });
		if (state.remainingDueCount > 0) {
			const continueButton = buttonRow?.createEl('button', {
				text: lang.review.complete.continueButton,
				cls: 'er-btn-show mod-cta',
			});
			continueButton?.addEventListener('click', () => {
				void this.reloadAndStartSession();
			});
		}

		const doneButton = buttonRow?.createEl('button', {
			text: lang.review.complete.button,
			cls: state.remainingDueCount > 0 ? 'er-btn-secondary' : 'er-btn-show mod-cta',
		});
		doneButton?.addEventListener('click', () => {
			this.notifyComplete();
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.session?.dispose();
		this.session = null;
		this.header = null;
		if (this.shouldTriggerComplete && this.completionState?.remainingDueCount === 0) {
			this.notifyComplete();
		}
	}

	private async reloadAndStartSession(): Promise<void> {
		const cards = this.reloadCards
			? await this.reloadCards()
			: this.cards;

		if (cards.length === 0) {
			this.notifyComplete();
			this.close();
			return;
		}

		this.cards = cards;
		this.startSession();
	}

	private notifyComplete(): void {
		if (!this.onComplete || this.completionNotified) {
			return;
		}

		this.completionNotified = true;
		this.onComplete();
	}
}
