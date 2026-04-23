/**
 * Tests for settings module
 */

import { SettingsManager, DEFAULT_SETTINGS, OBReviewsSettings } from '../settings';

// Mock Obsidian's Plugin class
const mockLoadData = jest.fn();
const mockSaveData = jest.fn();

const createMockPlugin = () => ({
	loadData: mockLoadData,
	saveData: mockSaveData,
});

describe('SettingsManager', () => {
	let manager: SettingsManager;
	let mockPlugin: ReturnType<typeof createMockPlugin>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockPlugin = createMockPlugin();
		manager = new SettingsManager(mockPlugin as unknown as import('obsidian').Plugin);
	});

	describe('load', () => {
		it('should load default settings when no data exists', async () => {
			mockLoadData.mockResolvedValue(null);
			
			await manager.load();
			
			const settings = manager.get();
			expect(settings.language).toBe('auto');
			expect(settings.debugMode).toBe(false);
			expect(settings.reviewSurface).toBe('modal');
		});

		it('should merge loaded settings with defaults', async () => {
			mockLoadData.mockResolvedValue({ language: 'en', debugMode: true });
			
			await manager.load();
			
			const settings = manager.get();
			expect(settings.language).toBe('en');
			expect(settings.debugMode).toBe(true);
			expect(settings.reviewSurface).toBe('modal');
		});

		it('should load tab review surface', async () => {
			mockLoadData.mockResolvedValue({ language: 'en', debugMode: true, reviewSurface: 'tab' });

			await manager.load();

			const settings = manager.get();
			expect(settings.reviewSurface).toBe('tab');
		});

		it('should ignore removed legacy settings fields', async () => {
			mockLoadData.mockResolvedValue({
				language: 'zh',
				defaultEase: 300,
				debugMode: true,
			});

			await manager.load();

			const settings = manager.get();
			expect(settings).toEqual({
				language: 'zh',
				debugMode: true,
				reviewSurface: 'modal',
			});
			expect((settings as OBReviewsSettings & { defaultEase?: number }).defaultEase).toBeUndefined();
		});

		it('should handle empty object', async () => {
			mockLoadData.mockResolvedValue({});
			
			await manager.load();
			
			const settings = manager.get();
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});
	});

	describe('save', () => {
		it('should save current settings', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			await manager.save();
			
			expect(mockSaveData).toHaveBeenCalledWith(DEFAULT_SETTINGS);
		});
	});

	describe('update', () => {
		it('should update specific settings', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			await manager.update({ language: 'zh' });
			
			const settings = manager.get();
			expect(settings.language).toBe('zh');
			expect(settings.debugMode).toBe(false); // unchanged
			expect(settings.reviewSurface).toBe('modal');
		});

		it('should update review surface', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ reviewSurface: 'tab' });

			const settings = manager.get();
			expect(settings.reviewSurface).toBe('tab');
		});

		it('should save after update', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			await manager.update({ debugMode: true });
			
			expect(mockSaveData).toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('should reset to default settings', async () => {
			mockLoadData.mockResolvedValue({ language: 'en', debugMode: true });
			await manager.load();
			
			await manager.reset();
			
			const settings = manager.get();
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});

		it('should save after reset', async () => {
			mockLoadData.mockResolvedValue({ language: 'en' });
			await manager.load();
			
			await manager.reset();
			
			expect(mockSaveData).toHaveBeenCalledWith(DEFAULT_SETTINGS);
		});
	});

	describe('get', () => {
		it('should return a copy of settings', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			const settings1 = manager.get();
			const settings2 = manager.get();
			
			expect(settings1).toEqual(settings2);
			expect(settings1).not.toBe(settings2); // different reference
		});
	});
});

describe('DEFAULT_SETTINGS', () => {
	it('should have correct default values', () => {
		expect(DEFAULT_SETTINGS.language).toBe('auto');
		expect(DEFAULT_SETTINGS.debugMode).toBe(false);
		expect(DEFAULT_SETTINGS.reviewSurface).toBe('modal');
	});
});
