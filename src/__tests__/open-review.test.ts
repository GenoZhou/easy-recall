jest.mock('obsidian', () => {
	class Modal {
		app: any;
		constructor(app: any) {
			this.app = app;
		}
		open() {}
	}

	class ItemView {
		leaf: any;
		app: any;
		contentEl: any;
		scope: any;
		constructor(leaf: any) {
			this.leaf = leaf;
			this.app = leaf.app;
			this.contentEl = leaf.contentEl;
			this.scope = { register: jest.fn() };
		}
	}

	class TFile {}
	class MarkdownView {}
	class Component {}
	class Notice {}

	return {
		Modal,
		ItemView,
		TFile,
		MarkdownView,
		Component,
		Notice,
		Platform: { isMobile: false },
		MarkdownRenderer: {
			renderMarkdown: jest.fn(),
		},
	};
}, { virtual: true });

import { openReview, openReviewTab } from '../ui/open-review';
import { REVIEW_VIEW_TYPE, ReviewView } from '../ui/review-view';
import { ReviewModal } from '../ui/review-modal';
import type { Card } from '../types';

describe('openReview', () => {
	const card: Card = {
		id: '1',
		type: 'cloze',
		content: '==answer==',
		tags: [],
		filePath: 'cards.md',
		lineStart: 0,
		lineEnd: 0,
	};

	it('should open modal review surface', async () => {
		const app = { vault: {} } as any;
		const openSpy = jest.spyOn(ReviewModal.prototype, 'open').mockImplementation(jest.fn());

		await openReview(app, { cards: [card], vault: app.vault }, 'modal');

		expect(openSpy).toHaveBeenCalled();
		openSpy.mockRestore();
	});

	it('should reuse an existing review tab', async () => {
		const view = {
			setReview: jest.fn().mockResolvedValue(undefined),
		};
		Object.setPrototypeOf(view, ReviewView.prototype);

		const leaf = { view };
		const app = {
			vault: {},
			workspace: {
				getLeavesOfType: jest.fn().mockReturnValue([leaf]),
				getLeaf: jest.fn(),
				revealLeaf: jest.fn().mockResolvedValue(undefined),
			},
		} as any;

		await openReviewTab(app, { cards: [card], vault: app.vault });

		expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith(REVIEW_VIEW_TYPE);
		expect(app.workspace.getLeaf).not.toHaveBeenCalled();
		expect(app.workspace.revealLeaf).toHaveBeenCalledWith(leaf);
		expect(view.setReview).toHaveBeenCalledWith({ cards: [card], vault: app.vault });
	});

	it('should create a review tab when none exists', async () => {
		const view = {
			setReview: jest.fn().mockResolvedValue(undefined),
		};
		Object.setPrototypeOf(view, ReviewView.prototype);

		const leaf = {
			view,
			setViewState: jest.fn().mockResolvedValue(undefined),
		};
		const app = {
			vault: {},
			workspace: {
				getLeavesOfType: jest.fn().mockReturnValue([]),
				getLeaf: jest.fn().mockReturnValue(leaf),
				revealLeaf: jest.fn().mockResolvedValue(undefined),
			},
		} as any;

		await openReviewTab(app, { cards: [card], vault: app.vault });

		expect(app.workspace.getLeaf).toHaveBeenCalledWith('tab');
		expect(leaf.setViewState).toHaveBeenCalledWith({
			type: REVIEW_VIEW_TYPE,
			active: true,
		});
		expect(view.setReview).toHaveBeenCalledWith({ cards: [card], vault: app.vault });
	});
});
