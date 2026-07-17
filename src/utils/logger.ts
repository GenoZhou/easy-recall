/**
 * 日志工具
 * 遵循 Obsidian 最佳实践：提供可控的日志记录
 */

// 调试模式开关（生产环境应设为 false）
let DEBUG = false;

/**
 * 设置调试模式
 */
export function setDebugMode(enabled: boolean): void {
	DEBUG = enabled;
}

/**
 * 调试日志 - 仅在 DEBUG 为 true 时输出
 * 符合最佳实践：避免在生产环境输出过多日志
 */
export function debug(...args: unknown[]): void {
	if (DEBUG) {
		console.log('[easy-recall]', ...args);
	}
}

/**
 * 信息日志 - 仅在 DEBUG 为 true 时输出
 * 避免默认输出不必要的 console 日志
 */
export function info(...args: unknown[]): void {
	if (DEBUG) {
		console.log('[easy-recall]', ...args);
	}
}

/**
 * 警告日志 - 始终输出
 */
export function warn(...args: unknown[]): void {
	console.warn('[easy-recall]', ...args);
}

/**
 * 错误日志 - 始终输出
 */
export function error(...args: unknown[]): void {
	console.error('[easy-recall]', ...args);
}
