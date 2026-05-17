const obsidianPlatform = { isMobile: false };

jest.mock('obsidian', () => {
	class TFile {
		path = '';
	}

	class MarkdownView {}
	class Component {}
	class Notice {}

	return {
		TFile,
		MarkdownView,
		Component,
		Notice,
		Platform: obsidianPlatform,
		MarkdownRenderer: {
			renderMarkdown: jest.fn().mockResolvedValue(undefined),
		},
	};
}, { virtual: true });

import type { Card } from '../types';
import { MarkdownRenderer } from 'obsidian';
import { ReviewSession, getReviewStatusTags } from '../ui/review-session';

class TestElement {
	tag: string;
	textContent = '';
	className = '';
	children: TestElement[] = [];
	attributes: Record<string, string> = {};
	listeners: Record<string, Function[]> = {};
	href = '';

	constructor(tag: string = 'div') {
		this.tag = tag;
	}

	empty(): void {
		this.children = [];
		this.textContent = '';
	}

	createDiv(options: { cls?: string; text?: string } = {}): TestElement {
		return this.createEl('div', options);
	}

	createSpan(options: { cls?: string; text?: string } = {}): TestElement {
		return this.createEl('span', options);
	}

	createEl(tag: string, options: { cls?: string; text?: string } = {}): TestElement {
		const child = new TestElement(tag);
		child.className = options.cls ?? '';
		child.textContent = options.text ?? '';
		this.children.push(child);
		return child;
	}

	querySelector(selector: string): TestElement | null {
		const className = selector.startsWith('.') ? selector.slice(1) : selector;
		return this.findByClass(className);
	}

	setAttribute(name: string, value: string): void {
		this.attributes[name] = value;
	}

	addEventListener(eventName: string, listener: Function): void {
		this.listeners[eventName] = this.listeners[eventName] ?? [];
		this.listeners[eventName].push(listener);
	}

	private findByClass(className: string): TestElement | null {
		if (this.className.split(/\s+/).includes(className)) {
			return this;
		}

		for (const child of this.children) {
			const match = child.findByClass(className);
			if (match) return match;
		}

		return null;
	}
}

function createCard(overrides: Partial<Card> = {}): Card {
	return {
		id: 'card-1',
		type: 'cloze',
		content: 'Question ==answer==',
		tags: [],
		filePath: 'cards.md',
		lineStart: 0,
		lineEnd: 0,
		...overrides,
	};
}

function createHost() {
	return {
		contentEl: new TestElement(),
		buttonsEl: new TestElement(),
		setTitle: jest.fn(),
		complete: jest.fn(),
		openSource: jest.fn().mockResolvedValue(true),
	};
}

function createScope() {
	const handlers = new Map<string, (evt: KeyboardEvent) => boolean>();
	const scope = {
		register: jest.fn((_modifiers: unknown, key: string, callback: (evt: KeyboardEvent) => boolean) => {
			handlers.set(key, callback);
			return { key };
		}),
		unregister: jest.fn(),
	};

	return { scope, handlers };
}

function keyEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		key,
		preventDefault: jest.fn(),
		repeat: false,
		...options,
	} as KeyboardEvent;
}

async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe('ReviewSession shortcuts', () => {
	const originalHTMLElement = (globalThis as any).HTMLElement;

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-05-10T00:00:00Z'));
		obsidianPlatform.isMobile = false;
	});

	afterEach(() => {
		(globalThis as any).HTMLElement = originalHTMLElement;
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it('registers desktop shortcuts', () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn() } as any,
		}, host as any);
		const { scope } = createScope();

		session.registerShortcuts(scope as any);

		expect(scope.register).toHaveBeenCalledTimes(4);
		expect(scope.register.mock.calls.map(call => call[1])).toEqual(['Space', '1', '2', '3']);
	});

	it('does not register shortcuts on mobile', () => {
		obsidianPlatform.isMobile = true;
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn() } as any,
		}, host as any);
		const { scope } = createScope();

		session.registerShortcuts(scope as any);

		expect(scope.register).not.toHaveBeenCalled();
	});

	it('uses Space to show hint, then answer, without rating', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard({ hint: 'Helpful hint' })],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		const { scope, handlers } = createScope();

		session.registerShortcuts(scope as any);
		await session.render();

		expect(host.buttonsEl.querySelector('.er-btn-show-hint')?.querySelector('.er-btn-shortcut')?.textContent).toBe('Space');
		expect(host.buttonsEl.querySelector('.er-btn-show')?.querySelector('.er-btn-shortcut')).toBeNull();

		handlers.get('Space')!(keyEvent(' '));
		await flushPromises();
		expect(host.complete).not.toHaveBeenCalled();
		expect(host.buttonsEl.querySelector('.er-btn-show-hint')).toBeNull();
		expect(host.buttonsEl.querySelector('.er-btn-show')?.querySelector('.er-btn-shortcut')?.textContent).toBe('Space');

		handlers.get('Space')!(keyEvent(' '));
		await flushPromises();
		expect(host.complete).not.toHaveBeenCalled();
		expect(host.buttonsEl.querySelector('.er-btn-good')).not.toBeNull();

		handlers.get('Space')!(keyEvent(' '));
		await flushPromises();
		expect(host.complete).not.toHaveBeenCalled();
	});

	it('uses Space to show answer immediately when there is no hint', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		const { scope, handlers } = createScope();

		session.registerShortcuts(scope as any);
		await session.render();

		expect(host.buttonsEl.querySelector('.er-btn-show')?.querySelector('.er-btn-shortcut')?.textContent).toBe('Space');

		handlers.get('Space')!(keyEvent(' '));
		await flushPromises();

		expect(host.buttonsEl.querySelector('.er-btn-good')).not.toBeNull();
		expect(host.complete).not.toHaveBeenCalled();
	});

	it('ignores Space repeat events', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		const { scope, handlers } = createScope();

		session.registerShortcuts(scope as any);
		await session.render();

		handlers.get('Space')!(keyEvent(' ', { repeat: true }));
		await flushPromises();

		expect(host.buttonsEl.querySelector('.er-btn-show')).not.toBeNull();
		expect(host.complete).not.toHaveBeenCalled();
	});

	it('does not capture shortcuts from editable fields', async () => {
		class FakeHTMLElement {
			tagName: string;
			isContentEditable: boolean;

			constructor(tagName: string, isContentEditable: boolean = false) {
				this.tagName = tagName;
				this.isContentEditable = isContentEditable;
			}
		}
		(globalThis as any).HTMLElement = FakeHTMLElement;

		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		await session.render();

		const inputEvent = keyEvent(' ', { target: new FakeHTMLElement('input') as any });
		const editableEvent = keyEvent(' ', { target: new FakeHTMLElement('div', true) as any });

		expect(session.handleShortcutEvent(inputEvent)).toBe(true);
		expect(session.handleShortcutEvent(editableEvent)).toBe(true);
		expect(inputEvent.preventDefault).not.toHaveBeenCalled();
		expect(editableEvent.preventDefault).not.toHaveBeenCalled();
		expect(host.buttonsEl.querySelector('.er-btn-show')).not.toBeNull();
	});

	it('renders desktop shortcut hints on review buttons', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();
		expect(host.buttonsEl.querySelector('.er-btn-shortcut')?.textContent).toBe('Space');

		session.showAnswerAction();
		await flushPromises();

		expect(host.buttonsEl.querySelector('.er-btn-again')?.querySelector('.er-btn-shortcut')?.textContent).toBe('1');
		expect(host.buttonsEl.querySelector('.er-btn-hard')?.querySelector('.er-btn-shortcut')?.textContent).toBe('2');
		expect(host.buttonsEl.querySelector('.er-btn-good')?.querySelector('.er-btn-shortcut')?.textContent).toBe('3');
	});

	it('hides shortcut hints when the review tab is not focused', async () => {
		const host = {
			...createHost(),
			areShortcutsActive: jest.fn().mockReturnValue(false),
		};
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();

		expect(host.buttonsEl.querySelector('.er-shortcuts-inactive')?.textContent).toBe('点击这里以启用快捷键');
		expect(host.buttonsEl.querySelector('.er-btn-shortcut')).toBeNull();
	});

	it('renders a new-card status tag for cards never rated hard or good', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard({ tags: ['test'] })],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();

		expect(host.contentEl.querySelector('.er-tag')?.textContent).toBe('#test');
		expect(host.contentEl.querySelector('.er-status-tag-new')?.textContent).toBe('新卡片');
	});

	it('shows heading path text without answer-word masking', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard({
				content: 'Question ==answer==',
				filePath: 'cards/answer.md',
				headingPath: ['answer details'],
			})],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();
		const headingPath = host.contentEl.querySelector('.er-heading-path');
		expect(headingPath?.textContent).toBe('answer / answer details');
		expect(headingPath?.attributes['aria-label']).toContain('answer / answer details');
	});

	it('builds new-card status only before the first hard or good rating', () => {
		expect(getReviewStatusTags(createCard())).toHaveLength(1);
		expect(getReviewStatusTags(createCard({
			schedule: {
				interval: 0,
				ease: 230,
				due: new Date('2026-05-10T00:00:00Z'),
				reps: 0,
			},
		}))).toHaveLength(1);
		expect(getReviewStatusTags(createCard({
			schedule: {
				interval: 1,
				ease: 250,
				due: new Date('2026-05-11T00:00:00Z'),
				reps: 1,
			},
		}))).toHaveLength(0);
	});

	it('limits a review session to the configured batch size', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [
				createCard({ id: 'card-1' }),
				createCard({ id: 'card-2' }),
				createCard({ id: 'card-3' }),
			],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
			maxCardsPerReview: 2,
		}, host as any);

		await session.render();
		expect(host.setTitle.mock.calls.at(-1)?.[0]).toContain('(1/2)');

		session.showAnswerAction();
		await flushPromises();
		session.rateAction(3);
		await flushPromises();
		expect(host.setTitle.mock.calls.at(-1)?.[0]).toContain('(2/2)');

		session.showAnswerAction();
		await flushPromises();
		session.rateAction(3);
		await flushPromises();
		expect(host.complete).toHaveBeenCalledTimes(1);
		expect(host.complete).toHaveBeenCalledWith({ remainingDueCount: 1 });
	});

	it('does not adjust cards outside the current review batch', async () => {
		const host = createHost();
		const nextCard = createCard({ id: 'card-2', lineStart: 20, lineEnd: 20 });

		const session = new ReviewSession({} as any, {
			cards: [
				createCard({ id: 'card-1', lineStart: 10, lineEnd: 10 }),
				nextCard,
			],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
			maxCardsPerReview: 1,
		}, host as any);

		await session.render();
		session.showAnswerAction();
		await flushPromises();
		session.rateAction(3);
		await flushPromises();

		expect(host.complete).toHaveBeenCalledWith({ remainingDueCount: 1 });
		expect(nextCard.lineStart).toBe(20);
		expect(nextCard.lineEnd).toBe(20);
	});

	it('reviews due scheduled cards before new cards', async () => {
		jest.setSystemTime(new Date('2026-05-10T00:00:00Z'));
		const host = createHost();
		const renderMarkdown = MarkdownRenderer.renderMarkdown as jest.Mock;
		renderMarkdown.mockClear();

		const session = new ReviewSession({} as any, {
			cards: [
				createCard({ id: 'new-card', content: 'New ==card==' }),
				createCard({
					id: 'newer-due-card',
					content: 'Newer due ==card==',
					schedule: {
						interval: 1,
						ease: 250,
						due: new Date('2026-05-09T00:00:00Z'),
						reps: 1,
					},
				}),
				createCard({
					id: 'older-due-card',
					content: 'Older due ==card==',
					schedule: {
						interval: 1,
						ease: 250,
						due: new Date('2026-05-08T00:00:00Z'),
						reps: 1,
					},
				}),
			],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();
		expect(renderMarkdown.mock.calls.at(-1)?.[0]).toContain('Older due');
	});

	it('reviews learned due cards before learning cards with zero reps', async () => {
		jest.setSystemTime(new Date('2026-05-10T00:00:00Z'));
		const host = createHost();
		const renderMarkdown = MarkdownRenderer.renderMarkdown as jest.Mock;
		renderMarkdown.mockClear();

		const session = new ReviewSession({} as any, {
			cards: [
				createCard({
					id: 'learning-card',
					content: 'Learning ==card==',
					schedule: {
						interval: 0,
						ease: 250,
						due: new Date('2026-05-08T00:00:00Z'),
						reps: 0,
					},
				}),
				createCard({
					id: 'learned-due-card',
					content: 'Learned due ==card==',
					schedule: {
						interval: 1,
						ease: 250,
						due: new Date('2026-05-09T00:00:00Z'),
						reps: 1,
					},
				}),
			],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();
		expect(renderMarkdown.mock.calls.at(-1)?.[0]).toContain('Learned due');
	});

	it.each(['1', '2', '3'])('rates with %s immediately after answer is visible', async (shortcut) => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		const { scope, handlers } = createScope();

		session.registerShortcuts(scope as any);
		await session.render();

		handlers.get(shortcut)!(keyEvent(shortcut));
		await flushPromises();
		expect(host.buttonsEl.querySelector('.er-btn-show')).not.toBeNull();
		expect(host.complete).not.toHaveBeenCalled();

		handlers.get('Space')!(keyEvent(' '));
		await flushPromises();

		handlers.get(shortcut)!(keyEvent(shortcut));
		await flushPromises();

		if (shortcut === '1') {
			expect(host.complete).not.toHaveBeenCalled();
			expect(host.buttonsEl.querySelector('.er-btn-show')).not.toBeNull();
		} else {
			expect(host.complete).toHaveBeenCalledTimes(1);
		}
	});
});
