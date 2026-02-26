import { Rating } from '../types';
import { t } from '../i18n';

/**
 * 评分按钮配置
 * 改为函数以支持动态语言切换
 */
export function getRatingButtons(): { rating: Rating; label: string; shortcut: string; cls: string }[] {
	const lang = t();
	return [
		{ rating: 1, label: lang.rating.again, shortcut: '1', cls: 'obr-btn-again' },
		{ rating: 2, label: lang.rating.hard, shortcut: '2', cls: 'obr-btn-hard' },
		{ rating: 3, label: lang.rating.good, shortcut: '3', cls: 'obr-btn-good' },
		{ rating: 4, label: lang.rating.easy, shortcut: '4', cls: 'obr-btn-easy' },
	];
}

/**
 * 快捷键配置
 */
export const KEYBOARD_SHORTCUTS = {
	SHOW_ANSWER: 'Enter',
	RATINGS: ['1', '2', '3', '4'] as const,
};

/**
 * 动画时长（毫秒）
 */
export const ANIMATION_DURATION = 200;

/**
 * 扫描批处理大小
 */
export const SCAN_BATCH_SIZE = 10;
