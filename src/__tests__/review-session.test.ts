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
import { ENTER_RATING_COOLDOWN_MS } from '../config/constants';
import { ReviewSession } from '../ui/review-session';

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

function createCard(): Card {
	return {
		id: 'card-1',
		type: 'cloze',
		content: 'Question ==answer==',
		tags: [],
		filePath: 'cards.md',
		lineStart: 0,
		lineEnd: 0,
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
		expect(scope.register.mock.calls.map(call => call[1])).toEqual(['Enter', '1', '2', '3']);
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

	it('uses Enter to reveal, then waits for cooldown before rating Good', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		const { scope, handlers } = createScope();

		session.registerShortcuts(scope as any);
		await session.render();

		handlers.get('Enter')!(keyEvent('Enter'));
		await flushPromises();
		expect(host.complete).not.toHaveBeenCalled();
		expect(host.buttonsEl.querySelector('.obr-btn-good')?.className).toContain('is-enter-cooling');

		handlers.get('Enter')!(keyEvent('Enter'));
		await flushPromises();
		expect(host.complete).not.toHaveBeenCalled();

		jest.advanceTimersByTime(ENTER_RATING_COOLDOWN_MS);
		await flushPromises();
		expect(host.buttonsEl.querySelector('.obr-btn-good')?.className).not.toContain('is-enter-cooling');

		handlers.get('Enter')!(keyEvent('Enter'));
		await flushPromises();
		expect(host.complete).toHaveBeenCalledTimes(1);
	});

	it('ignores Enter repeat events', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);
		const { scope, handlers } = createScope();

		session.registerShortcuts(scope as any);
		await session.render();

		handlers.get('Enter')!(keyEvent('Enter', { repeat: true }));
		await flushPromises();

		expect(host.buttonsEl.querySelector('.obr-btn-show')).not.toBeNull();
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

		const inputEvent = keyEvent('Enter', { target: new FakeHTMLElement('input') as any });
		const editableEvent = keyEvent('Enter', { target: new FakeHTMLElement('div', true) as any });

		expect(session.handleShortcutEvent(inputEvent)).toBe(true);
		expect(session.handleShortcutEvent(editableEvent)).toBe(true);
		expect(inputEvent.preventDefault).not.toHaveBeenCalled();
		expect(editableEvent.preventDefault).not.toHaveBeenCalled();
		expect(host.buttonsEl.querySelector('.obr-btn-show')).not.toBeNull();
	});

	it('renders desktop shortcut hints on review buttons', async () => {
		const host = createHost();
		const session = new ReviewSession({} as any, {
			cards: [createCard()],
			vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) } as any,
		}, host as any);

		await session.render();
		expect(host.buttonsEl.querySelector('.obr-btn-shortcut')?.textContent).toBe('Enter');

		session.showAnswerAction();
		await flushPromises();

		expect(host.buttonsEl.querySelector('.obr-btn-again')?.querySelector('.obr-btn-shortcut')?.textContent).toBe('1');
		expect(host.buttonsEl.querySelector('.obr-btn-hard')?.querySelector('.obr-btn-shortcut')?.textContent).toBe('2');
		expect(host.buttonsEl.querySelector('.obr-btn-good')?.querySelector('.obr-btn-shortcut')?.textContent).toBe('3');
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
		expect(host.buttonsEl.querySelector('.obr-btn-show')).not.toBeNull();
		expect(host.complete).not.toHaveBeenCalled();

		handlers.get('Enter')!(keyEvent('Enter'));
		await flushPromises();

		handlers.get(shortcut)!(keyEvent(shortcut));
		await flushPromises();

		if (shortcut === '1') {
			expect(host.complete).not.toHaveBeenCalled();
			expect(host.buttonsEl.querySelector('.obr-btn-show')).not.toBeNull();
		} else {
			expect(host.complete).toHaveBeenCalledTimes(1);
		}
	});
});
