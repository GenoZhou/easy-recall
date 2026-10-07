const obsidianPlatform = { isMobile: false };

jest.mock('obsidian', () => ({
	Platform: obsidianPlatform,
}), { virtual: true });

import { mountReviewHeader } from '../ui/review-header';

class TestElement {
	tag: string;
	textContent = '';
	className = '';
	disabled = false;
	children: TestElement[] = [];
	attributes: Record<string, string> = {};
	listeners: Record<string, Function[]> = {};

	constructor(tag: string = 'div') {
		this.tag = tag;
	}

	empty(): void {
		this.children = [];
		this.textContent = '';
	}

	createSpan(options: { cls?: string; text?: string } = {}): TestElement {
		return this.createEl('span', options);
	}

	createEl(
		tag: string,
		options: { cls?: string; text?: string; attr?: Record<string, string> } = {}
	): TestElement {
		const child = new TestElement(tag);
		child.className = options.cls ?? '';
		child.textContent = options.text ?? '';
		if (options.attr) {
			Object.assign(child.attributes, options.attr);
		}
		this.children.push(child);
		return child;
	}

	querySelector(selector: string): TestElement | null {
		const className = selector.startsWith('.') ? selector.slice(1) : selector;
		return this.findByClass(className);
	}

	addEventListener(eventName: string, listener: Function): void {
		this.listeners[eventName] = this.listeners[eventName] ?? [];
		this.listeners[eventName].push(listener);
	}

	get classList() {
		return {
			add: (className: string) => {
				const classes = new Set(this.className.split(/\s+/).filter(Boolean));
				classes.add(className);
				this.className = Array.from(classes).join(' ');
			},
			remove: (className: string) => {
				this.className = this.className
					.split(/\s+/)
					.filter(existing => existing && existing !== className)
					.join(' ');
			},
		};
	}

	addClass(className: string): void {
		this.classList.add(className);
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

describe('mountReviewHeader', () => {
	afterEach(() => {
		obsidianPlatform.isMobile = false;
	});

	it('hides the undo control when enableUndo is off', () => {
		const container = new TestElement();
		mountReviewHeader(container as any);
		expect(container.querySelector('.er-btn-undo')).toBeNull();
	});

	it('includes ⌫ in the desktop label and toggles canUndo', () => {
		const container = new TestElement();
		const undoHandler = jest.fn();
		const header = mountReviewHeader(container as any, {
			enableUndo: true,
			onUndo: undoHandler,
		});
		const undoButton = container.querySelector('.er-btn-undo') as TestElement;

		expect(undoButton.disabled).toBe(true);
		expect(undoButton.textContent).toBe('撤回上个 ⌫');

		header.setHeader({ title: '复习卡片 (1/2)', canUndo: true });
		expect(container.querySelector('.er-review-header-title')?.textContent).toBe('复习卡片 (1/2)');
		expect(undoButton.disabled).toBe(false);

		undoButton.listeners.click?.[0]?.();
		expect(undoHandler).toHaveBeenCalledTimes(1);

		header.setHeader({ title: '复习卡片 (1/2)', canUndo: false });
		expect(undoButton.disabled).toBe(true);
	});

	it('omits ⌫ from the mobile label', () => {
		obsidianPlatform.isMobile = true;
		const container = new TestElement();
		mountReviewHeader(container as any, { enableUndo: true });
		const undoButton = container.querySelector('.er-btn-undo') as TestElement;
		expect(undoButton.textContent).toBe('撤回上个');
	});
});
