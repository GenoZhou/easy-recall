import type { Translations } from './en';

/**
 * 中文翻译
 */
export const zh: Translations = {
	// 评分按钮
	rating: {
		again: '没记住',
		hard: '有点难',
		good: '记住了',
	},

	// 命令
	commands: {
		startReview: '开始复习',
		reviewCurrentNote: '复习当前笔记内到期卡片',
	},

	// 通知
	notifications: {
		reviewComplete: '复习完成！',
		noDueCards: '该卡组没有到期卡片',
		noDueCardsInNote: '当前笔记没有到期的卡片',
		failedToStart: '启动复习失败，请检查控制台',
		failedToSave: '❌ 保存失败，请重试',
		failedToOpenFile: '❌ 打开原文失败，请重试',
		fileChanged: (path: string) => `复习文件已变更: ${path}`,
		undoFailed: '❌ 撤回失败，请重试',
	},

	// 卡组选择器
	deckSelector: {
		placeholder: '搜索卡组',
		loading: '正在扫描卡片...',
		loadFailed: '加载失败，请重试',
		emptyState: '没有找到匹配的卡组',
		noDecks: '暂无卡组',
		stats: {
			decks: '个卡组',
			cards: '张卡片',
			due: '张到期',
			new: '张新卡',
			scheduled: '张已调度',
		},
		allDeck: {
			name: '全部到期',
			hint: '复习所有标签里到期的卡片',
			aliases: ['@all', 'all', '全部'],
		},
		virtualDecks: {
			leech: {
				name: '易错加练',
				hint: '常错的卡，即使还没到期',
				aliases: ['@leech', 'leech', '易错', '易错题'],
			},
			new: {
				name: '新卡到期',
				hint: '只学到期新卡，先不还旧账',
				aliases: ['@new', 'new', '新卡'],
			},
		},
		taggedHint: '只复习这个标签里的到期卡',
		dueDeck: (tag: string) => `${tag}到期`,
		deckItem: {
			count: (count: number) => `${count} 张`,
		},
		instructions: {
			navigate: '导航',
			select: '复习选中',
			close: '关闭',
		},
	},

	// 复习界面
	review: {
		title: '复习卡片',
		progress: (current: number, total: number) => `复习卡片 (${current}/${total})`,
		showAnswer: '显示答案',
		showHint: '显示提示',
		openSource: '打开原文',
		hint: '提示',
		shortcutsInactive: '点击这里以启用快捷键',
		statusTags: {
			newCard: '新卡片',
		},
		complete: {
			title: '复习完成',
			button: '完成',
			continueButton: '继续复习',
			remaining: (count: number) => `当前卡组还有 ${count} 张到期卡片。`,
		},
	},

	settings: {
		sections: {
			stats: '统计',
		},
		language: {
			name: '界面语言',
			desc: '界面语言。自动模式会跟随 Obsidian 设置。',
			auto: '自动',
			en: 'English',
			zh: '中文',
		},
		debug: {
			name: '调试模式',
			desc: '在控制台显示调试日志（需重启生效）。',
		},
		deckTagPrefix: {
			name: '卡组标签前缀',
			desc: '用于查找卡组的标签前缀，例如 easy-recall 对应 #easy-recall/math。',
		},
		reviewBatchSize: {
			name: '单次复习上限',
			desc: '每次复习会话最多放入队列的到期卡片数量。',
		},
		reviewSurface: {
			name: '复习界面',
			desc: '选择复习卡片时使用模态窗口，还是复用一个 Obsidian 标签页。',
			modal: '模态窗口',
			tab: '标签页',
		},
		clickToRevealCloze: {
			name: '点击逐项复习',
			desc: '点按挖空会在隐藏、显示、删除线之间循环。有划掉视为「没记住」；全部显示后可选「有点难」或「记住了」。',
			demoPrefix: '地球绕着 ',
			demoAnswer1: '太阳',
			demoMiddle: ' 转，月球绕着 ',
			demoAnswer2: '地球',
			demoSuffix: ' 转。',
			demoEmptyHint: '全部挖空项显示或划掉后，会出现评分按钮。',
			demoRevealAriaLabel: '切换挖空状态',
		},
		leechLapses: {
			name: '易错卡组阈值',
			desc: '「没记住」达到此次数后进入易错加练，连续记住后会离开。',
		},
		showLeechDeck: {
			name: '易错加练卡组',
			desc: '选组时列出经常没记住的卡，即使尚未到期。连续记住后会自动离开。',
		},
		showNewDeck: {
			name: '新卡到期卡组',
			desc: '选组时单独列出到期新卡，便于欠账多时只学新卡。',
		},
		shortcuts: {
			title: '快捷键',
			undoBefore: '按 ',
			undoAfterMac: ' 撤回上一次评分',
			undoAfterWindows: '（退格）撤回上一次评分',
		},
		stats: {
			desc: '查看复习摘要和接下来几个复习窗口。',
			refresh: '刷新',
			loading: '正在加载复习统计...',
			loadFailed: '加载复习统计失败。',
			empty: '还没有找到复习卡片。',
			total: '总卡片数',
			totalDecks: '总卡组数',
			matureCards: '成熟卡',
			dueNow: '当前到期',
			dayAxis: '到期日期',
			countAxis: '到期卡片数',
			dateCount: (date: string, count: number) => `${date}：${count} 张到期卡片`,
			onlyDueDates: '仅显示有到期卡片的日期。',
			noUpcoming: '未来 30 天没有已排期到期卡片。',
		},
	},

	// 时间格式化
	time: {
		now: '现在',
		minutes: (n: number) => `${n} 分钟后`,
		hours: (n: number) => `${n} 小时后`,
		days: (n: number) => `${n} 天后`,
		weeks: (n: number) => `${n} 周后`,
		months: (n: number) => `${n} 个月后`,
		years: (n: number) => `${n} 年后`,
		tomorrow: '明天',
		today: '今天',
		yesterday: '昨天',
		immediate: '立即',
	},

	// 卡片类型
	cardTypes: {
		cloze: '挖空',
		qa: '问答',
	},
};
