import type { Translations } from './en';
import { en } from './en';
import { zh } from './zh';

export type Language = 'en' | 'zh' | 'auto';

const translations: Record<Exclude<Language, 'auto'>, Translations> = {
	en,
	zh,
};

let currentLanguage: Exclude<Language, 'auto'> = 'zh'; // 默认中文（内部使用，auto 会被解析）

/**
 * 设置当前语言
 */
export function setLanguage(lang: Exclude<Language, 'auto'>): void {
	currentLanguage = lang;
}

/**
 * 获取当前语言
 */
export function getLanguage(): Exclude<Language, 'auto'> {
	return currentLanguage;
}

/**
 * 获取翻译文本
 */
export function t(): Translations {
	return translations[currentLanguage];
}

/**
 * 根据 Obsidian 语言自动检测
 */
export function detectLanguage(): Exclude<Language, 'auto'> {
	// Obsidian 的 localStorage 中存储了语言设置
	const obsidianLang = localStorage.getItem('language');
	if (obsidianLang?.startsWith('zh')) {
		return 'zh';
	}
	return 'en';
}

/**
 * 解析语言设置（将 auto 转换为实际语言）
 */
export function resolveLanguage(lang: Language): Exclude<Language, 'auto'> {
	if (lang === 'auto') {
		return detectLanguage();
	}
	return lang;
}

/**
 * 初始化语言
 * @param lang 语言设置，默认为 'auto'（自动检测）
 */
export function initLanguage(lang: Language = 'auto'): void {
	currentLanguage = resolveLanguage(lang);
}

export { en, zh };
export type { Translations };
