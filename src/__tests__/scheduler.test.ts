import {
  createInitialSchedule,
  calcSchedule,
  isDue,
  formatDueDate,
  getNextReviewText,
} from '../scheduler';
import { Schedule, Rating } from '../types';

describe('scheduler', () => {
  const mockNow = new Date('2026-02-18T12:00:00Z');
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createInitialSchedule', () => {
    it('should create initial schedule with correct defaults', () => {
      const schedule = createInitialSchedule();
      
      expect(schedule.interval).toBe(0);
      expect(schedule.ease).toBe(250);
      expect(schedule.reps).toBe(0);
      expect(schedule.due).toEqual(mockNow);
    });
  });

  describe('calcSchedule - new cards', () => {
    it('should set interval to 0 and due to now with Again', () => {
      const newSchedule = calcSchedule(null, 1);
      
      // 没记住: interval=0, due=now
      expect(newSchedule.interval).toBe(0);
      expect(newSchedule.ease).toBe(250);
      expect(newSchedule.reps).toBe(0);
      expect(newSchedule.due).toEqual(mockNow);
    });

    it('should preserve ease across repeated Again ratings before first success', () => {
      let schedule = calcSchedule(null, 1);
      schedule = calcSchedule(schedule, 1);
      schedule = calcSchedule(schedule, 1);

      expect(schedule.interval).toBe(0);
      expect(schedule.ease).toBe(250);
      expect(schedule.reps).toBe(0);
      expect(schedule.due).toEqual(mockNow);
    });

    it('should schedule for 6 hours with Hard on first review', () => {
      const newSchedule = calcSchedule(null, 2);
      
      expect(newSchedule.interval).toBe(0.25);
      expect(newSchedule.ease).toBe(235);
      expect(newSchedule.reps).toBe(1);
      
      const diffMs = newSchedule.due.getTime() - mockNow.getTime();
      expect(diffMs).toBeGreaterThan(5 * 60 * 60 * 1000);
      expect(diffMs).toBeLessThan(7 * 60 * 60 * 1000);
    });

    it('should schedule for 1 day with Good on first review', () => {
      const newSchedule = calcSchedule(null, 3);
      
      expect(newSchedule.interval).toBe(1);
      expect(newSchedule.ease).toBe(255);
      expect(newSchedule.reps).toBe(1);
      
      const expectedDue = new Date(mockNow);
      expectedDue.setDate(expectedDue.getDate() + 1);
      expect(newSchedule.due).toEqual(expectedDue);
    });

    it('should schedule for 1 day with Good on first review', () => {
      const newSchedule = calcSchedule(null, 3);
      
      expect(newSchedule.interval).toBe(1);
      expect(newSchedule.reps).toBe(1);
      
      const expectedDue = new Date(mockNow);
      expectedDue.setDate(expectedDue.getDate() + 1);
      expect(newSchedule.due).toEqual(expectedDue);
    });
  });

  describe('calcSchedule - existing cards with Good (3)', () => {
    it('should set interval to 1 when reps is 0', () => {
      const current: Schedule = {
        interval: 0.02,
        ease: 250,
        due: mockNow,
        reps: 0,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      expect(newSchedule.interval).toBe(1);
      expect(newSchedule.reps).toBe(1);
    });

    it('should let learning cards progress with Good after first success', () => {
      const current: Schedule = {
        interval: 1,
        ease: 255,
        due: mockNow,
        reps: 1,
      };

      const newSchedule = calcSchedule(current, 3);

      expect(newSchedule.interval).toBeCloseTo(2.55, 5);
      expect(newSchedule.reps).toBe(2);
    });

    it('should calculate interval using ease formula when reps >= 2', () => {
      const current: Schedule = {
        interval: 1,
        ease: 250,
        due: mockNow,
        reps: 2,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      // interval = 1 * 250 / 100 = 2.5
      expect(newSchedule.interval).toBeCloseTo(2.5, 5);
      expect(newSchedule.reps).toBe(3);
    });

    it('should cap interval at maximum 365 days', () => {
      const current: Schedule = {
        interval: 200,
        ease: 300,
        due: mockNow,
        reps: 5,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      expect(newSchedule.interval).toBe(365);
    });

    it('should increase ease slowly with Good rating', () => {
      const current: Schedule = {
        interval: 3,
        ease: 280,
        due: mockNow,
        reps: 2,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      expect(newSchedule.ease).toBe(285);
    });
  });

  describe('calcSchedule - existing cards with Again (1)', () => {
    it('should roll mature cards back to 25% interval', () => {
      const current: Schedule = {
        interval: 10,
        ease: 250,
        due: mockNow,
        reps: 5,
      };
      
      const newSchedule = calcSchedule(current, 1);
      
      expect(newSchedule.interval).toBe(2.5);
    });

    it('should decrease ease by 20', () => {
      const current: Schedule = {
        interval: 5,
        ease: 250,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 1);
      
      expect(newSchedule.ease).toBe(230);
    });

    it('should not decrease ease below minimum 130', () => {
      const current: Schedule = {
        interval: 5,
        ease: 140,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 1);
      
      expect(newSchedule.ease).toBe(130);
    });

    it('should preserve reps for mature cards', () => {
      const current: Schedule = {
        interval: 5,
        ease: 250,
        due: mockNow,
        reps: 10,
      };
      
      const newSchedule = calcSchedule(current, 1);
      
      expect(newSchedule.reps).toBe(10);
    });

    it('should set due based on rolled-back interval', () => {
      const current: Schedule = {
        interval: 8,
        ease: 250,
        due: new Date('2026-02-20T12:00:00Z'),
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 1);
      
      const expectedDue = new Date(mockNow);
      expectedDue.setDate(expectedDue.getDate() + 2);
      expect(newSchedule.due).toEqual(expectedDue);
    });

    it('should keep mature Again interval at least 1 day', () => {
      const current: Schedule = {
        interval: 2,
        ease: 250,
        due: mockNow,
        reps: 3,
      };

      const newSchedule = calcSchedule(current, 1);

      expect(newSchedule.interval).toBe(1);
    });
  });

  describe('calcSchedule - Hard (2) rating', () => {
    it('should increase interval by 1.2x', () => {
      const current: Schedule = {
        interval: 10,
        ease: 250,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 2);
      
      expect(newSchedule.interval).toBe(12); // 10 * 1.2
    });

    it('should decrease ease by 15', () => {
      const current: Schedule = {
        interval: 5,
        ease: 250,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 2);
      
      expect(newSchedule.ease).toBe(235);
    });
  });

  describe('calcSchedule - Good (3) rating for existing cards', () => {
    it('should increase interval by standard formula', () => {
      const current: Schedule = {
        interval: 10,
        ease: 250,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      // 10 * 250 / 100 = 25
      expect(newSchedule.interval).toBe(25);
    });

    it('should recover ease by 5', () => {
      const current: Schedule = {
        interval: 5,
        ease: 250,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      expect(newSchedule.ease).toBe(255);
    });

    it('should cap recovered ease at maximum', () => {
      const current: Schedule = {
        interval: 5,
        ease: 348,
        due: mockNow,
        reps: 3,
      };
      
      const newSchedule = calcSchedule(current, 3);
      
      expect(newSchedule.ease).toBe(350);
    });
  });

  describe('isDue', () => {
    it('should return true for new cards (undefined schedule)', () => {
      expect(isDue(undefined)).toBe(true);
    });

    it('should return true when due date is in the past', () => {
      const schedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-17T12:00:00Z'),
        reps: 1,
      };
      expect(isDue(schedule)).toBe(true);
    });

    it('should return true when due date is now', () => {
      const schedule: Schedule = {
        interval: 1,
        ease: 250,
        due: mockNow,
        reps: 1,
      };
      expect(isDue(schedule)).toBe(true);
    });

    it('should return false when due date is in the future', () => {
      const schedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-20T12:00:00Z'),
        reps: 1,
      };
      expect(isDue(schedule)).toBe(false);
    });
  });

  describe('formatDueDate', () => {
    it('should return "今天" for past dates', () => {
      const date = new Date('2026-02-18T10:00:00Z');
      expect(formatDueDate(date)).toBe('今天');
    });

    it('should return "今天" for current time', () => {
      expect(formatDueDate(mockNow)).toBe('今天');
    });

    it('should return "明天" for tomorrow', () => {
      const date = new Date('2026-02-19T12:00:00Z');
      expect(formatDueDate(date)).toBe('明天');
    });

    it('should return "X 天后" for within a week', () => {
      const date = new Date('2026-02-23T12:00:00Z');
      expect(formatDueDate(date)).toBe('5 天后');
    });

    it('should return "X 周后" for within a month', () => {
      const date = new Date('2026-03-04T12:00:00Z');
      expect(formatDueDate(date)).toBe('2 周后');
    });

    it('should return "X 个月后" for within a year', () => {
      const date = new Date('2026-05-18T12:00:00Z');
      expect(formatDueDate(date)).toBe('2 个月后');
    });

    it('should return "X 年后" for more than a year', () => {
      const date = new Date('2028-02-18T12:00:00Z');
      expect(formatDueDate(date)).toBe('2 年后');
    });
  });

  describe('getNextReviewText', () => {
    it('should return immediately for Again', () => {
      const schedule: Schedule = {
        interval: 5,
        ease: 250,
        due: mockNow,
        reps: 2,
      };
      const text = getNextReviewText(schedule, 1);
      expect(text).toBe('明天');
    });

    it('should return appropriate time for Hard', () => {
      const schedule: Schedule = {
        interval: 0.5,
        ease: 250,
        due: mockNow,
        reps: 1,
      };
      const text = getNextReviewText(schedule, 2);
      // 0.5 * 1.2 = 0.6 days = ~14 hours
      expect(text).toContain('小时');
    });

    it('should return days for Good', () => {
      const schedule: Schedule = {
        interval: 2,
        ease: 250,
        due: mockNow,
        reps: 2,
      };
      const text = getNextReviewText(schedule, 3);
      expect(text).toBe('5 天后');
    });

    it('should return standard days for Good', () => {
      const schedule: Schedule = {
        interval: 2,
        ease: 250,
        due: mockNow,
        reps: 2,
      };
      const text = getNextReviewText(schedule, 3);
      expect(text).toBe('5 天后');
    });
  });
});
