import { Schedule } from './types';

/**
 * 格式化调度信息为 SR 注释
 * <!--SR:interval,ease,due,reps-->
 */
export function formatSchedule(schedule: Schedule): string {
	const dueISO = schedule.due.toISOString();
	// 限制 interval 小数位，避免浮点运算产生 7.9559999999999995 这种长尾数字
	const interval = Number(schedule.interval.toFixed(2));
	const ease = Math.round(schedule.ease);
	return `<!--SR:${interval},${ease},${dueISO},${schedule.reps}-->`;
}

/**
 * 在文本中查找并替换 SR 注释
 * SR 注释放在题目前（lineStart - 1）
 * @param lineStart 卡片起始行号
 * @param scheduleLine SR 注释所在的行号（如果有），用于精确定位
 */
export function injectSchedule(text: string, schedule: Schedule, lineStart: number, scheduleLine?: number): string {
	const lines = text.split('\n');
	const scheduleComment = formatSchedule(schedule);
	
	// 如果有明确的 scheduleLine，直接替换那一行
	if (scheduleLine !== undefined && scheduleLine < lines.length) {
		const line = lines[scheduleLine];
		if (line && line.trim().startsWith('<!--SR:')) {
			lines[scheduleLine] = scheduleComment;
			return lines.join('\n');
		}
	}
	
	// 检查 lineStart 前是否已有 SR 注释
	const checkLine = lineStart - 1;
	if (checkLine >= 0) {
		const line = lines[checkLine];
		if (line && line.trim().startsWith('<!--SR:')) {
			// 替换现有注释
			lines[checkLine] = scheduleComment;
			return lines.join('\n');
		}
	}

	// 在 lineStart 前插入新注释
	lines.splice(lineStart, 0, scheduleComment);
	return lines.join('\n');
}

/**
 * 从文本中移除指定行的 SR 注释（用于 undo 新卡片评分）
 */
export function deleteScheduleLine(text: string, lineIndex: number): string {
	const lines = text.split('\n');
	if (lineIndex >= 0 && lineIndex < lines.length) {
		const line = lines[lineIndex];
		if (line && line.trim().startsWith('<!--SR:')) {
			lines.splice(lineIndex, 1);
			return lines.join('\n');
		}
	}
	return text;
}

/**
 * 从文本中移除 SR 注释（用于重置卡片）
 */
export function removeSchedule(text: string): string {
	const SR_COMMENT_REGEX = /<!--SR:[\d.]+,\d+,[^,]+,\d+-->\n?/g;
	return text.replace(SR_COMMENT_REGEX, '');
}
