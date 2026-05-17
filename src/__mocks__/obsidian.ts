export class Notice {
  constructor(public message: string, public timeout?: number) {}
}

export class TFile {
  path = '';
  extension = 'md';
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {}
export class ItemView {}
export class WorkspaceLeaf {}

export function getLanguage(): string {
  return 'en';
}

export function addIcon(): void {}
export function setIcon(): void {}
