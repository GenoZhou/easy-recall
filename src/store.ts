import { Schedule } from './types';

/**
 * 格式化调度信息为 SR 注释
 * FSRS 格式: <!--SR:interval,difficulty,stability,due,reps,lapses-->
 * 简化格式: <!--SR:interval,due,reps--> (当使用默认参数时)
 */
export function formatSchedule(schedule: Schedule): string {
	const dueISO = schedule.due.toISOString();
	
	// FSRS 格式：包含 difficulty 和 stability
	if (schedule.algorithm === 'fsrs' || schedule.difficulty !== undefined) {
		const difficulty = schedule.difficulty ?? 5;
		const stability = schedule.stability ?? schedule.interval;
		const lapses = schedule.lapses ?? 0;
		return `<!--SR:${schedule.interval},${difficulty},${stability},${dueISO},${schedule.reps},${lapses}-->`;
	}
	
	// SM-2 兼容格式
	const ease = schedule.ease ?? 250;
	return `<!--SR:${schedule.interval},${ease},${dueISO},${schedule.reps}-->`;
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
 * 从文本中移除 SR 注释（用于重置卡片）
 * 支持新旧两种格式
 */
export function removeSchedule(text: string): string {
	// 新格式 (FSRS): <!--SR:interval,difficulty,stability,due,reps,lapses-->
	// 旧格式 (SM-2): <!--SR:interval,ease,due,reps-->
	const SR_COMMENT_REGEX = /<!--SR:[\d\.,]+,[^>]+-->\n?/g;
	return text.replace(SR_COMMENT_REGEX, '');
}
