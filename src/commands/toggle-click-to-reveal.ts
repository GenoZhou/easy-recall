/**
 * Toggle click-to-reveal cloze review command
 */

import { Notice } from 'obsidian';
import { t } from '../i18n';
import { info } from '../utils/';
import type { CommandContext } from './types';

/**
 * Execute toggle click-to-reveal cloze review
 */
export async function executeToggleClickToRevealCloze(context: CommandContext): Promise<void> {
	const { plugin } = context;
	const lang = t();

	const newValue = !plugin.settings.clickToRevealCloze;
	info('Toggling click-to-reveal cloze review to:', newValue);

	await plugin.settingsManager.update({ clickToRevealCloze: newValue });
	plugin.settings = plugin.settingsManager.get();

	new Notice(
		newValue
			? lang.notifications.clickToRevealEnabled
			: lang.notifications.clickToRevealDisabled,
		2000
	);
}

/**
 * Get command config
 */
export function getToggleClickToRevealClozeCommand(context: CommandContext) {
	const lang = t();

	return {
		id: 'toggle-click-to-reveal-cloze',
		name: lang.commands.toggleClickToRevealCloze,
		callback: () => executeToggleClickToRevealCloze(context),
	};
}
