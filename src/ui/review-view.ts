import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { t } from '../i18n';
import { mountReviewHeader, ReviewHeaderControls } from './review-header';
import { ReviewCompletionState, ReviewOptions, ReviewSession, openCardSource } from './review-session';

export const REVIEW_VIEW_TYPE = 'easy-recall-review';

export class ReviewView extends ItemView {
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;
	private header: ReviewHeaderControls | null = null;
	private session: ReviewSession | null = null;
	private reviewOptions: ReviewOptions | null = null;
	private onComplete?: () => void;
	private domShortcutsRegistered: boolean = false;
	private shortcutsActive: boolean = false;
	private completionState: ReviewCompletionState | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return REVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t().review.title;
	}

	async onOpen(): Promise<void> {
		this.renderShell();
	}

	async setReview(options: ReviewOptions): Promise<void> {
		if (!this.cardContentEl || !this.buttonsContainerEl || !this.headerEl) {
			this.renderShell();
		}

		this.onComplete = options.onComplete;
		this.reviewOptions = options;
		this.completionState = null;
		this.session?.dispose();
		this.header = mountReviewHeader(this.headerEl!, {
			enableUndo: options.enableUndo === true,
			onUndo: () => {
				void this.session?.undo();
			},
		});
		this.session = new ReviewSession(this.app, options, {
			contentEl: this.cardContentEl!,
			buttonsEl: this.buttonsContainerEl!,
			setHeader: (state) => this.header?.setHeader(state),
			complete: (state) => this.completeReview(state),
			openSource: (card) => openCardSource(this.app, options.vault, card, true),
			areShortcutsActive: () => this.shortcutsActive,
			handleCompleteSpace: () => {
				if (this.completionState && this.completionState.remainingDueCount > 0) {
					this.continueReview();
				} else {
					this.finishReview();
				}
			},
			onUndoFromComplete: () => {
				this.completionState = null;
			},
		});
		await this.session.render();
		this.contentEl.focus();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
		this.session?.dispose();
		this.session = null;
		this.reviewOptions = null;
		this.header = null;
		this.headerEl = null;
	}

	private renderShell(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('er-review-view');
		contentEl.tabIndex = -1;
		if (!this.domShortcutsRegistered) {
			// ItemView Scope can miss keys when focus is not owned by the view.
			// Keep tab shortcuts local to the focused review container instead of binding globally.
			this.registerDomEvent(contentEl, 'keydown', (evt: KeyboardEvent) => {
				this.session?.handleShortcutEvent(evt);
			});
			this.registerDomEvent(contentEl, 'click', () => {
				contentEl.focus();
			});
			this.registerDomEvent(contentEl, 'focusin', () => {
				this.setShortcutsActive(true);
			});
			this.registerDomEvent(contentEl, 'focusout', (evt: FocusEvent) => {
				const nextTarget = evt.relatedTarget;
				if (nextTarget instanceof Node && contentEl.contains(nextTarget)) {
					return;
				}
				this.setShortcutsActive(false);
			});
			this.domShortcutsRegistered = true;
		}

		this.headerEl = contentEl.createDiv({ cls: 'er-review-view-header' });
		this.header = null;
		this.cardContentEl = contentEl.createDiv({ cls: 'er-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'er-buttons' });
	}

	private setShortcutsActive(active: boolean): void {
		if (this.shortcutsActive === active) {
			return;
		}

		this.shortcutsActive = active;
		void this.session?.render();
	}

	private completeReview(state: ReviewCompletionState): void {
		this.completionState = state;
		const lang = t();
		const canUndo = this.session?.canUndo() ?? false;
		const keepCompleteScreen = state.remainingDueCount > 0 || canUndo;

		this.cardContentEl?.empty();
		this.buttonsContainerEl?.empty();
		this.header?.setHeader({
			title: lang.review.complete.title,
			canUndo,
		});
		this.cardContentEl?.createEl('p', { text: lang.notifications.reviewComplete });

		if (!keepCompleteScreen) {
			this.finishReview();
			return;
		}

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
			continueButton?.addEventListener('click', () => this.continueReview());
		}

		const doneButton = buttonRow?.createEl('button', {
			text: lang.review.complete.button,
			cls: state.remainingDueCount > 0 ? 'er-btn-secondary' : 'er-btn-show mod-cta',
		});
		doneButton?.addEventListener('click', () => this.finishReview());
	}

	private continueReview(): void {
		if (!this.reviewOptions) {
			return;
		}

		void this.reloadAndSetReview();
	}

	private async reloadAndSetReview(): Promise<void> {
		if (!this.reviewOptions) {
			return;
		}

		const cards = this.reviewOptions.reloadCards
			? await this.reviewOptions.reloadCards()
			: this.reviewOptions.cards;

		if (cards.length === 0) {
			this.finishReview();
			return;
		}

		await this.setReview({
			...this.reviewOptions,
			cards,
		});
	}

	private finishReview(): void {
		if (this.onComplete) {
			this.onComplete();
		} else {
			new Notice(t().notifications.reviewComplete, 2000);
		}
		this.leaf.detach();
	}
}
