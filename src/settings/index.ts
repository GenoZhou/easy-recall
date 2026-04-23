/**
 * 插件设置管理
 * 遵循 Obsidian 最佳实践：使用 loadData/saveData 持久化配置
 */

import { Plugin } from 'obsidian';

/**
 * 插件设置接口
 */
export interface OBReviewsSettings {
	/** 界面语言 */
	language: 'auto' | 'en' | 'zh';
	/** 是否显示调试日志 */
	debugMode: boolean;
	/** 桌面端复习界面展示方式 */
	desktopReviewSurface: ReviewSurface;
	/** 手机端复习界面展示方式 */
	mobileReviewSurface: ReviewSurface;
}

export type ReviewSurface = 'modal' | 'tab';

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: OBReviewsSettings = {
	language: 'auto',
	debugMode: false,
	desktopReviewSurface: 'modal',
	mobileReviewSurface: 'modal',
};

/**
 * 设置管理器
 */
export class SettingsManager {
	private plugin: Plugin;
	private settings: OBReviewsSettings;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = { ...DEFAULT_SETTINGS };
	}

	/**
	 * 加载设置
	 */
	async load(): Promise<void> {
		const loaded = await this.plugin.loadData();
		if (loaded) {
			const legacyReviewSurface = loaded.reviewSurface as ReviewSurface | undefined;
			this.settings = {
				language: loaded.language ?? DEFAULT_SETTINGS.language,
				debugMode: loaded.debugMode ?? DEFAULT_SETTINGS.debugMode,
				desktopReviewSurface: loaded.desktopReviewSurface ?? legacyReviewSurface ?? DEFAULT_SETTINGS.desktopReviewSurface,
				mobileReviewSurface: loaded.mobileReviewSurface ?? legacyReviewSurface ?? DEFAULT_SETTINGS.mobileReviewSurface,
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
	get(): OBReviewsSettings {
		return { ...this.settings };
	}

	/**
	 * 更新设置
	 */
	async update(updates: Partial<OBReviewsSettings>): Promise<void> {
		this.settings = { ...this.settings, ...updates };
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

export function getActiveReviewSurface(settings: OBReviewsSettings, isMobile: boolean): ReviewSurface {
	return isMobile ? settings.mobileReviewSurface : settings.desktopReviewSurface;
}

// 设置面板单独导出（避免测试时加载 Obsidian UI 依赖）
// 使用: import { SettingsTab } from './settings/tab';
