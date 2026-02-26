import { Card, CardType, Schedule } from './types';

// 挖空检测：==内容==
const CLOZE_REGEX = /==([^=]+)==/g;

// 标签检测：#ob-reviews/xxxx 格式（支持中文和Unicode字符）
const DECK_TAG_REGEX = /#ob-reviews\/([^\s#]+)/;

// SR 注释格式：
// 旧格式 (SM-2): <!--SR:interval,ease,due,reps-->
// 新格式 (FSRS): <!--SR:interval,difficulty,stability,due,reps,lapses-->
const SR_COMMENT_REGEX = /<!--SR:([\d\.]+),([\d\.]+),([\d\.]+),([^,]+),(\d+),(\d+)-->/;  // FSRS 6字段
const SR_COMMENT_REGEX_OLD = /<!--SR:([\d\.]+),(\d+),([^,]+),(\d+)-->/;  // SM-2 4字段

// Hint callout 检测：> [!hint]
const HINT_CALLOUT_REGEX = /^> \[!hint\]/i;

/**
 * 从文本中提取调度信息
 * 支持 FSRS 新格式和 SM-2 旧格式
 * 包含数据验证，确保解析出的日期有效
 */
export function extractSchedule(text: string): Schedule | null {
	// 先尝试新格式 (FSRS)
	let match = text.match(SR_COMMENT_REGEX);
	if (match) {
		const interval = parseFloat(match[1]);
		const difficulty = parseFloat(match[2]);
		const stability = parseFloat(match[3]);
		const due = new Date(match[4]);
		const reps = parseInt(match[5], 10);
		const lapses = parseInt(match[6], 10);

		if (isNaN(due.getTime())) {
			console.warn('[ob-reviews] Invalid date in SR comment:', match[4]);
			return null;
		}

		if (isNaN(interval) || isNaN(reps)) {
			console.warn('[ob-reviews] Invalid numeric values in SR comment');
			return null;
		}

		return {
			interval,
			difficulty,
			stability,
			due,
			reps,
			lapses,
			algorithm: 'fsrs',
		};
	}

	// 尝试旧格式 (SM-2)
	match = text.match(SR_COMMENT_REGEX_OLD);
	if (match) {
		const interval = parseFloat(match[1]);
		const ease = parseInt(match[2], 10);
		const due = new Date(match[3]);
		const reps = parseInt(match[4], 10);

		if (isNaN(due.getTime())) {
			console.warn('[ob-reviews] Invalid date in SR comment:', match[3]);
			return null;
		}

		if (isNaN(interval) || isNaN(ease) || isNaN(reps)) {
			console.warn('[ob-reviews] Invalid numeric values in SR comment');
			return null;
		}

		return { interval, ease, due, reps };
	}

	return null;
}

/**
 * 从文本中提取卡组标签（#ob-reviews/xxxx 中的 xxxx）
 * 返回 xxxx 部分，如果没有则返回 null
 */
export function extractDeckTag(text: string): string | null {
	const match = text.match(DECK_TAG_REGEX);
	return match ? match[1] : null; // 返回捕获组中的 xxxx
}

/**
 * 生成卡片唯一 ID
 */
function generateCardId(filePath: string, lineStart: number, type: CardType, index: number): string {
	return `${filePath}:${lineStart}:${type}:${index}`;
}

/**
 * 检查文本是否包含挖空
 */
export function hasCloze(text: string): boolean {
	CLOZE_REGEX.lastIndex = 0;
	return CLOZE_REGEX.test(text);
}

/**
 * 获取挖空内容（用于答案显示）
 */
export function extractClozeAnswers(text: string): string {
	const answers: string[] = [];
	let match;
	CLOZE_REGEX.lastIndex = 0;
	while ((match = CLOZE_REGEX.exec(text)) !== null) {
		answers.push(match[1].trim());
	}
	return answers.join(' / ');
}

/**
 * 从 YAML frontmatter 的 tags 中提取卡组标签
 * 格式: ---\ntags:\n  - ob-reviews/xxxx\n---
 */
function extractYamlDeckTag(content: string): string | null {
	// 匹配 YAML frontmatter
	const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
	if (!yamlMatch) return null;
	
	const yaml = yamlMatch[1];
	// 匹配 tags: 下的 ob-reviews/xxxx 格式
	const tagMatch = yaml.match(/tags:\s*\n([\s\S]*?)(?:\n\w|$)/);
	if (tagMatch) {
		const tagsSection = tagMatch[1];
		// 匹配每个标签项 - ob-reviews/xxxx（支持中文和Unicode字符）
		const obReviewMatch = tagsSection.match(/-\s*ob-reviews\/([^\s#]+)/);
		if (obReviewMatch) {
			return obReviewMatch[1]; // 返回 xxxx 部分
		}
	}
	return null;
}

/**
 * 从文件内容提取文件级别的卡组标签（#ob-reviews/xxxx 或 YAML frontmatter 中的 xxxx）
 */
export function extractFileDeckTag(content: string): string | null {
	// 先尝试从 YAML frontmatter 提取
	const yamlTag = extractYamlDeckTag(content);
	if (yamlTag) return yamlTag;
	
	// 再尝试从正文中的 #ob-reviews/xxxx 提取
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		// 跳过空行、注释和 YAML 分隔符
		if (!line || line.startsWith('<!--') || line === '---') continue;
		
		// 遇到第二个 --- 说明 frontmatter 结束，开始正文搜索
		if (i > 0 && line === '---') {
			// 继续搜索正文中的标签
			for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
				const bodyLine = lines[j].trim();
				if (!bodyLine || bodyLine.startsWith('<!--')) continue;
				
				const tag = extractDeckTag(bodyLine);
				if (tag) return tag;
			}
			break;
		}
		
		const tag = extractDeckTag(line);
		if (tag) return tag;
	}
	return null;
}

/**
 * 解析单条笔记内容，提取所有卡片
 * 所有卡片共享文件级别的标签（#ob-reviews/xxxx 中的 xxxx）
 * 如果没有找到 ob-reviews/xxx 标签，返回空数组（不解析该文件）
 */
export function parseNote(content: string, filePath: string): Card[] {
	const cards: Card[] = [];
	const lines = content.split('\n');
	
	// 提取文件级别的标签（所有卡片共享）
	const deckTag = extractFileDeckTag(content);
	// 如果没有找到 ob-reviews/xxx 标签，不解析该文件
	if (!deckTag) {
		return [];
	}
	const fileTags = [deckTag];
	
	let lineIndex = 0;
	let cardIndex = 0;

	while (lineIndex < lines.length) {
		const line = lines[lineIndex];
		const trimmedLine = line.trim();

		// 跳过空行和注释行（SR 注释除外）
		if (!trimmedLine || (trimmedLine.startsWith('<!--') && !trimmedLine.startsWith('<!--SR:'))) {
			lineIndex++;
			continue;
		}

		// 检查前一行是否是 SR 注释（SR 注释现在放在题目前）
		const prevLineIndex = lineIndex - 1;
		const existingSchedule = prevLineIndex >= 0 ? extractSchedule(lines[prevLineIndex]) : null;

		// 尝试解析 QA 卡片（问题行 + ? + 答案行）
		const qaCard = tryParseQACard(lines, lineIndex, filePath, cardIndex, fileTags);
		if (qaCard) {
			// 检查卡片前一行是否是 SR 注释
			if (existingSchedule && lines[prevLineIndex].trim().startsWith('<!--SR:')) {
				qaCard.schedule = existingSchedule;
				qaCard.scheduleLine = prevLineIndex;
			}
			cards.push(qaCard);
			cardIndex++;
			lineIndex = qaCard.lineEnd + 1;
			continue;
		}

		// 尝试解析 Cloze 卡片（包含 ==高亮== 的行）
		if (hasCloze(line)) {
			const clozeCard = parseClozeCard(lines, lineIndex, filePath, cardIndex, fileTags);
			// 检查卡片前一行是否是 SR 注释
			if (existingSchedule && lines[prevLineIndex].trim().startsWith('<!--SR:')) {
				clozeCard.schedule = existingSchedule;
				clozeCard.scheduleLine = prevLineIndex;
			}
			cards.push(clozeCard);
			cardIndex++;
			lineIndex = clozeCard.lineEnd + 1;
			continue;
		}

		lineIndex++;
	}

	return cards;
}

/**
 * 收集答案行（直到空行、注释行、[hint] callout 或文件结束）
 * @returns 结束行索引（包含）
 */
function collectAnswerEnd(lines: string[], startIndex: number): number {
	let endIndex = startIndex;
	while (endIndex < lines.length) {
		const trimmedLine = lines[endIndex].trim();
		
		// 空行结束
		if (trimmedLine === '') {
			break;
		}
		
		// 注释行结束
		if (trimmedLine.startsWith('<!--')) {
			break;
		}
		
		// hint callout 结束（避免将 hint 当作答案）
		if (HINT_CALLOUT_REGEX.test(lines[endIndex])) {
			break;
		}
		
		endIndex++;
	}
	return endIndex - 1; // 回到最后一个非空行
}

/**
 * 提取 hint callout
 * 格式：> [!hint] 标题（可选）\n> 内容行1\n> 内容行2...
 * @returns 原始 callout 文本（不做任何处理）和结束行号，如果没有则返回 null
 */
function extractHintBlock(lines: string[], startIndex: number): { hint: string | null; endIndex: number } {
	if (startIndex >= lines.length) {
		return { hint: null, endIndex: startIndex - 1 };
	}

	const line = lines[startIndex];
	
	// 检查是否是 hint callout 开始
	if (!HINT_CALLOUT_REGEX.test(line)) {
		return { hint: null, endIndex: startIndex - 1 };
	}

	// 收集原始 callout 行（保留原始格式，包括 '> '）
	const hintLines: string[] = [];
	let currentIndex = startIndex;
	
	while (currentIndex < lines.length) {
		const currentLine = lines[currentIndex];
		const trimmedLine = currentLine.trimStart();
		
		// 检查是否以 '> ' 开头或就是 '>'（callout 行）
		if (trimmedLine.startsWith('> ') || trimmedLine === '>') {
			// 保留原始行（不去掉前缀）
			hintLines.push(currentLine);
			currentIndex++;
		} else {
			// 非 callout 行，结束收集
			break;
		}
	}

	if (hintLines.length === 0) {
		return { hint: null, endIndex: startIndex - 1 };
	}

	return {
		hint: hintLines.join('\n'),
		endIndex: currentIndex - 1
	};
}

/**
 * 创建 QA 卡片对象
 */
function createQACard(
	lines: string[],
	startIndex: number,
	answerStartIndex: number,
	answerEndIndex: number,
	question: string,
	content: string,
	filePath: string,
	cardIndex: number,
	fileTags: string[],
	hint?: string,
	finalEndIndex?: number
): Card {
	const answerLines = lines.slice(answerStartIndex, answerEndIndex + 1);
	const answer = answerLines.join('\n').trim();

	return {
		id: generateCardId(filePath, startIndex, 'qa', cardIndex),
		type: 'qa',
		content: content + answer,
		question: question,
		answer: answer,
		hint,
		tags: [...fileTags],
		filePath,
		lineStart: startIndex,
		lineEnd: finalEndIndex ?? answerEndIndex,
	};
}

/**
 * 尝试解析 QA 卡片
 * 格式：问题行 + ?（单独一行或行尾）+ 答案行（可多行）+ 可选的 hint callout
 */
function tryParseQACard(lines: string[], startIndex: number, filePath: string, cardIndex: number, fileTags: string[]): Card | null {
	const currentLine = lines[startIndex];
	const trimmedCurrent = currentLine.trim();

	// 情况 1：? 在行尾，如 "什么是 2+2?"（支持半角?和全角？）
	if ((trimmedCurrent.endsWith('?') || trimmedCurrent.endsWith('？')) && trimmedCurrent.length > 1) {
		if (startIndex + 1 < lines.length) {
			const nextLine = lines[startIndex + 1];
			if (nextLine.trim() && !nextLine.trim().startsWith('<!--')) {
				const answerEndIndex = collectAnswerEnd(lines, startIndex + 1);
				const question = trimmedCurrent.slice(0, -1).trim();
				
				// 检查答案后是否有 hint callout
				const hintStartIndex = answerEndIndex + 1;
				const { hint, endIndex: hintEndIndex } = extractHintBlock(lines, hintStartIndex);
				
				// 更新结束行号（包含 hint）
				const finalEndIndex = hint ? hintEndIndex : answerEndIndex;
				
				return createQACard(lines, startIndex, startIndex + 1, answerEndIndex, question, trimmedCurrent + '\n', filePath, cardIndex, fileTags, hint || undefined, finalEndIndex);
			}
		}
	}

	// 情况 2：? 单独一行（支持半角?和全角？）
	const nextLineTrimmed = startIndex + 1 < lines.length ? lines[startIndex + 1].trim() : '';
	if (nextLineTrimmed === '?' || nextLineTrimmed === '？') {
		if (startIndex + 2 < lines.length) {
			const answerEndIndex = collectAnswerEnd(lines, startIndex + 2);
			const questionMark = nextLineTrimmed; // 保留原始问号类型（半角或全角）
			
			// 检查答案后是否有 hint callout
			const hintStartIndex = answerEndIndex + 1;
			const { hint, endIndex: hintEndIndex } = extractHintBlock(lines, hintStartIndex);
			
			// 更新结束行号（包含 hint）
			const finalEndIndex = hint ? hintEndIndex : answerEndIndex;
			
			return createQACard(lines, startIndex, startIndex + 2, answerEndIndex, trimmedCurrent, trimmedCurrent + '\n' + questionMark + '\n', filePath, cardIndex, fileTags, hint || undefined, finalEndIndex);
		}
	}

	return null;
}

/**
 * 解析 Cloze 卡片
 * 支持可选的 hint callout
 */
function parseClozeCard(lines: string[], startIndex: number, filePath: string, cardIndex: number, fileTags: string[]): Card {
	const content = lines[startIndex].trim();
	
	// 检查当前行后是否有 hint callout
	const hintStartIndex = startIndex + 1;
	const { hint, endIndex: hintEndIndex } = extractHintBlock(lines, hintStartIndex);
	
	// 更新结束行号（包含 hint）
	const finalEndIndex = hint ? hintEndIndex : startIndex;

	return {
		id: generateCardId(filePath, startIndex, 'cloze', cardIndex),
		type: 'cloze',
		content: content,
		answer: extractClozeAnswers(content),
		hint: hint || undefined,
		tags: [...fileTags], // 使用文件级别标签
		filePath: filePath,
		lineStart: startIndex,
		lineEnd: finalEndIndex,
	};
}

/**
 * 渲染 Cloze 卡片内容（将 ==文本== 替换为可隐藏的 span）
 * @param showAnswer 是否显示答案
 */
export function renderClozeContent(content: string, showAnswer: boolean): string {
	if (showAnswer) {
		return content.replace(CLOZE_REGEX, '<span class="obr-cloze-show">$1</span>');
	} else {
		return content.replace(CLOZE_REGEX, '<span class="obr-cloze-hidden">$1</span>');
	}
}

/**
 * 渲染 QA 卡片内容
 */
export function renderQAContent(question: string, answer: string, showAnswer: boolean): string {
	if (showAnswer) {
		return `**${question}**\n\n${answer}`;
	} else {
		return `**${question}**`;
	}
}
