/**
 * 插件设置管理
 * 遵循 Obsidian 最佳实践：使用 loadData/saveData 持久化配置
 */

import { Plugin } from 'obsidian';
import { DEFAULT_DECK_TAG_PREFIX, normalizeDeckTagPrefix } from '../tag-prefix';

/**
 * 插件设置接口
 */
export interface EasyRecallSettings {
	/** 界面语言 */
	language: 'auto' | 'en' | 'zh';
	/** 卡组标签前缀 */
	deckTagPrefix: string;
	/** 是否显示调试日志 */
	debugMode: boolean;
	/** 单次复习最多进入队列的卡片数量 */
	reviewBatchSize: number;
	/** 复习界面展示方式 */
	reviewSurface: ReviewSurface;
	/** 是否启用点击逐个显示 Cloze 答案 */
	clickToRevealCloze: boolean;
}

export type ReviewSurface = 'modal' | 'tab';

export const DEFAULT_REVIEW_BATCH_SIZE = 20;

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: EasyRecallSettings = {
	language: 'auto',
	deckTagPrefix: DEFAULT_DECK_TAG_PREFIX,
	debugMode: false,
	reviewBatchSize: DEFAULT_REVIEW_BATCH_SIZE,
	reviewSurface: 'modal',
	clickToRevealCloze: false,
};

export function normalizeReviewBatchSize(value: unknown): number {
	const numericValue = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numericValue) || numericValue < 1) {
		return DEFAULT_REVIEW_BATCH_SIZE;
	}

	return Math.floor(numericValue);
}

export function normalizeReviewSurface(value: unknown): ReviewSurface | undefined {
	if (value === 'modal' || value === 'tab') {
		return value;
	}

	return undefined;
}

function resolveLoadedReviewSurface(loaded: {
	reviewSurface?: unknown;
	desktopReviewSurface?: unknown;
	mobileReviewSurface?: unknown;
}): ReviewSurface {
	const unified = normalizeReviewSurface(loaded.reviewSurface);
	if (unified) {
		return unified;
	}

	const desktop = normalizeReviewSurface(loaded.desktopReviewSurface);
	const mobile = normalizeReviewSurface(loaded.mobileReviewSurface);
	if (desktop && mobile && desktop !== mobile) {
		return DEFAULT_SETTINGS.reviewSurface;
	}

	return desktop ?? mobile ?? DEFAULT_SETTINGS.reviewSurface;
}

export function normalizeClickToRevealCloze(value: unknown): boolean {
	return value === true || value === 'enabled';
}

/**
 * 设置管理器
 */
export class SettingsManager {
	private plugin: Plugin;
	private settings: EasyRecallSettings;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = { ...DEFAULT_SETTINGS };
	}

	/**
	 * 加载设置
	 */
	async load(): Promise<void> {
		const loaded = await this.plugin.loadData() as Partial<EasyRecallSettings & {
			desktopReviewSurface?: ReviewSurface;
			mobileReviewSurface?: ReviewSurface;
		}> | null;
		if (loaded) {
			this.settings = {
				language: loaded.language ?? DEFAULT_SETTINGS.language,
				deckTagPrefix: normalizeDeckTagPrefix(loaded.deckTagPrefix ?? DEFAULT_SETTINGS.deckTagPrefix),
				debugMode: loaded.debugMode ?? DEFAULT_SETTINGS.debugMode,
				reviewBatchSize: normalizeReviewBatchSize(loaded.reviewBatchSize ?? DEFAULT_SETTINGS.reviewBatchSize),
				reviewSurface: resolveLoadedReviewSurface(loaded),
				clickToRevealCloze: normalizeClickToRevealCloze(loaded.clickToRevealCloze),
			};
		}
	}

	/**
	 * 保存设置
	 */
	async save(): Promise<void> {
		await this.plugin.saveData(this.settings);
	}

	/**
	 * 获取当前设置
	 */
	get(): EasyRecallSettings {
		return { ...this.settings };
	}

	/**
	 * 更新设置
	 */
	async update(updates: Partial<EasyRecallSettings>): Promise<void> {
		this.settings = { ...this.settings, ...updates };
		if (updates.reviewBatchSize !== undefined) {
			this.settings.reviewBatchSize = normalizeReviewBatchSize(updates.reviewBatchSize);
		}
		if (updates.deckTagPrefix !== undefined) {
			this.settings.deckTagPrefix = normalizeDeckTagPrefix(updates.deckTagPrefix);
		}
		if (updates.reviewSurface !== undefined) {
			this.settings.reviewSurface = normalizeReviewSurface(updates.reviewSurface) ?? DEFAULT_SETTINGS.reviewSurface;
		}
		await this.save();
	}

	/**
	 * 重置为默认设置
	 */
	async reset(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS };
		await this.save();
	}
}

/**
 * 创建设置管理器实例（工厂函数）
 */
export function createSettingsManager(plugin: Plugin): SettingsManager {
	return new SettingsManager(plugin);
}

// 设置面板单独导出（避免测试时加载 Obsidian UI 依赖）
// 使用: import { SettingsTab } from './settings/tab';
