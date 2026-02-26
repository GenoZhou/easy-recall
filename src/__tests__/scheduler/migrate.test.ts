/**
 * 数据迁移测试
 */

import {
  detectAlgorithm,
  needsMigration,
  migrateToFSRS,
  migrateSchedule,
  downgradeToSM2,
  validateSchedule,
  getScheduleStats,
} from '../../scheduler/migrate';
import { Schedule } from '../../types';

describe('Schedule Migration', () => {
  describe('detectAlgorithm', () => {
    it('should detect FSRS from algorithm field', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        algorithm: 'fsrs',
      };
      expect(detectAlgorithm(schedule)).toBe('fsrs');
    });

    it('should detect FSRS from difficulty field', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        difficulty: 5,
      };
      expect(detectAlgorithm(schedule)).toBe('fsrs');
    });

    it('should detect SM-2 from ease field', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        ease: 250,
      };
      expect(detectAlgorithm(schedule)).toBe('sm2');
    });

    it('should default to FSRS for null', () => {
      expect(detectAlgorithm(null)).toBe('fsrs');
    });
  });

  describe('needsMigration', () => {
    it('should return false for FSRS with algorithm field', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        algorithm: 'fsrs',
      };
      expect(needsMigration(schedule)).toBe(false);
    });

    it('should return true for SM-2 format', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        ease: 250,
      };
      expect(needsMigration(schedule)).toBe(true);
    });
  });

  describe('migrateToFSRS', () => {
    it('should migrate SM-2 to FSRS', () => {
      const sm2Schedule: Schedule = {
        interval: 5,
        due: new Date('2026-02-20T12:00:00Z'),
        reps: 3,
        ease: 250,
      };

      const fsrsSchedule = migrateToFSRS(sm2Schedule);

      expect(fsrsSchedule.algorithm).toBe('fsrs');
      expect(fsrsSchedule.difficulty).toBeDefined();
      expect(fsrsSchedule.stability).toBe(5);
      expect(fsrsSchedule.lapses).toBe(0);
      expect(fsrsSchedule.state).toBe('review');
    });

    it('should map high ease to low difficulty', () => {
      const sm2Schedule: Schedule = {
        interval: 5,
        due: new Date(),
        reps: 3,
        ease: 350, // 最高 ease
      };

      const fsrsSchedule = migrateToFSRS(sm2Schedule);
      expect(fsrsSchedule.difficulty).toBeLessThan(5);
    });

    it('should map low ease to high difficulty', () => {
      const sm2Schedule: Schedule = {
        interval: 5,
        due: new Date(),
        reps: 3,
        ease: 130, // 最低 ease
      };

      const fsrsSchedule = migrateToFSRS(sm2Schedule);
      expect(fsrsSchedule.difficulty).toBeGreaterThan(5);
    });

    it('should use default stability for new cards', () => {
      const sm2Schedule: Schedule = {
        interval: 0,
        due: new Date(),
        reps: 0,
        ease: 250,
      };

      const fsrsSchedule = migrateToFSRS(sm2Schedule);
      expect(fsrsSchedule.state).toBe('new');
      expect(fsrsSchedule.stability).toBeGreaterThan(0);
    });
  });

  describe('migrateSchedule', () => {
    it('should return null for null input', () => {
      expect(migrateSchedule(null)).toBeNull();
    });

    it('should add algorithm field to FSRS format', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        difficulty: 5,
        stability: 1,
      };

      const migrated = migrateSchedule(schedule);
      expect(migrated?.algorithm).toBe('fsrs');
    });

    it('should migrate SM-2 to FSRS', () => {
      const sm2Schedule: Schedule = {
        interval: 5,
        due: new Date(),
        reps: 3,
        ease: 250,
      };

      const migrated = migrateSchedule(sm2Schedule);
      expect(migrated?.algorithm).toBe('fsrs');
      expect(migrated?.difficulty).toBeDefined();
    });
  });

  describe('downgradeToSM2', () => {
    it('should convert FSRS to SM-2', () => {
      const fsrsSchedule: Schedule = {
        interval: 5,
        due: new Date(),
        reps: 3,
        difficulty: 5,
        stability: 5,
        lapses: 0,
        algorithm: 'fsrs',
      };

      const sm2Schedule = downgradeToSM2(fsrsSchedule);

      expect(sm2Schedule.algorithm).toBe('sm2');
      expect(sm2Schedule.ease).toBe(250);
      expect(sm2Schedule.difficulty).toBeUndefined();
      expect(sm2Schedule.stability).toBeUndefined();
    });
  });

  describe('validateSchedule', () => {
    it('should validate correct schedule', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        algorithm: 'fsrs',
        difficulty: 5,
        stability: 1,
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid difficulty', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        difficulty: 15, // 超出范围
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('difficulty must be between 1 and 10');
    });

    it('should detect negative stability', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date(),
        reps: 1,
        stability: -1,
      };

      const result = validateSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('stability must be non-negative');
    });
  });

  describe('getScheduleStats', () => {
    it('should return stats for FSRS schedule', () => {
      const schedule: Schedule = {
        interval: 5,
        due: new Date(),
        reps: 3,
        difficulty: 5,
        stability: 5,
        algorithm: 'fsrs',
      };

      const stats = getScheduleStats(schedule);
      expect(stats.type).toBe('fsrs');
      expect(stats.difficulty).toBe(5);
      expect(stats.stability).toBe(5);
    });

    it('should return stats for SM-2 schedule', () => {
      const schedule: Schedule = {
        interval: 5,
        due: new Date(),
        reps: 3,
        ease: 250,
      };

      const stats = getScheduleStats(schedule);
      expect(stats.type).toBe('sm2');
      expect(stats.ease).toBe(250);
    });
  });
});
