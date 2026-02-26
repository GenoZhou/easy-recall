/**
 * 错误处理工具
 * 统一错误处理和异步操作包装
 */

import { error } from './logger';

/**
 * 安全地执行异步操作，自动捕获和记录错误
 * 符合最佳实践：统一错误处理
 */
export async function safeAsync<T>(
	operation: () => Promise<T>,
	errorMessage: string
): Promise<T | null> {
	try {
		return await operation();
	} catch (err) {
		error(errorMessage, err);
		return null;
	}
}

/**
 * 同步操作的安全包装
 */
export function safeSync<T>(
	operation: () => T,
	errorMessage: string
): T | null {
	try {
		return operation();
	} catch (err) {
		error(errorMessage, err);
		return null;
	}
}
