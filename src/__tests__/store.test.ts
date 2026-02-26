import {
  formatSchedule,
  injectSchedule,
  removeSchedule,
} from '../store';
import { Schedule } from '../types';

describe('store', () => {
  describe('formatSchedule', () => {
    it('should format SM-2 schedule correctly', () => {
      const schedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-19T14:19:56.066Z'),
        reps: 1,
      };
      
      const formatted = formatSchedule(schedule);
      expect(formatted).toBe('<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->');
    });

    it('should handle float intervals (SM-2)', () => {
      const schedule: Schedule = {
        interval: 2.5,
        ease: 250,
        due: new Date('2026-02-21T14:19:56.066Z'),
        reps: 3,
      };
      
      const formatted = formatSchedule(schedule);
      expect(formatted).toBe('<!--SR:2.5,250,2026-02-21T14:19:56.066Z,3-->');
    });

    it('should format FSRS schedule correctly', () => {
      const schedule: Schedule = {
        interval: 0.25,
        due: new Date('2026-02-26T16:16:11.415Z'),
        reps: 1,
        difficulty: 5,
        stability: 0.25,
        lapses: 0,
        algorithm: 'fsrs',
      };
      
      const formatted = formatSchedule(schedule);
      expect(formatted).toBe('<!--SR:0.25,5,0.25,2026-02-26T16:16:11.415Z,1,0-->');
    });

    it('should format FSRS schedule with default values when fields missing', () => {
      const schedule: Schedule = {
        interval: 1,
        due: new Date('2026-02-26T16:16:11.415Z'),
        reps: 1,
        algorithm: 'fsrs',
        // difficulty, stability, lapses are undefined
      };
      
      const formatted = formatSchedule(schedule);
      expect(formatted).toBe('<!--SR:1,5,1,2026-02-26T16:16:11.415Z,1,0-->');
    });
  });

  describe('injectSchedule - replacing existing', () => {
    it('should replace existing SR comment on scheduleLine', () => {
      const text = `<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->
问题
答案`;
      
      const newSchedule: Schedule = {
        interval: 2,
        ease: 250,
        due: new Date('2026-02-20T14:19:56.066Z'),
        reps: 2,
      };
      
      // lineStart=1, scheduleLine=0 (SR comment before card)
      const result = injectSchedule(text, newSchedule, 1, 0);
      
      expect(result).toContain('<!--SR:2,250,2026-02-20T14:19:56.066Z,2-->');
      expect(result).not.toContain('<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->');
    });

    it('should replace existing SR comment before lineStart', () => {
      const text = `<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->
问题
答案`;
      
      const newSchedule: Schedule = {
        interval: 3,
        ease: 240,
        due: new Date('2026-02-22T14:19:56.066Z'),
        reps: 3,
      };
      
      // lineStart=1, check line 0 for existing SR comment
      const result = injectSchedule(text, newSchedule, 1, undefined);
      
      expect(result).toContain('<!--SR:3,240,2026-02-22T14:19:56.066Z,3-->');
      expect(result).not.toContain('<!--SR:1,250');
    });
  });

  describe('injectSchedule - inserting new', () => {
    it('should insert new SR comment before lineStart', () => {
      const text = `问题
答案`;
      
      const newSchedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-19T14:19:56.066Z'),
        reps: 1,
      };
      
      // lineStart=0 (问题行), insert before it
      const result = injectSchedule(text, newSchedule, 0, undefined);
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->');
      expect(lines[1]).toBe('问题');
      expect(lines[2]).toBe('答案');
    });

    it('should handle cloze card (single line)', () => {
      const text = '中医学是研究==人体生命运动==的科学。';
      
      const newSchedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-19T14:19:56.066Z'),
        reps: 1,
      };
      
      // lineStart=0, insert before it
      const result = injectSchedule(text, newSchedule, 0, undefined);
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->');
      expect(lines[1]).toBe('中医学是研究==人体生命运动==的科学。');
    });
  });

  describe('injectSchedule - edge cases', () => {
    it('should handle scheduleLine pointing to non-SR line gracefully', () => {
      const text = `问题
答案
其他内容`;
      
      const newSchedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-19T14:19:56.066Z'),
        reps: 1,
      };
      
      // scheduleLine=2 points to "其他内容", not an SR comment
      // Should insert before lineStart instead
      const result = injectSchedule(text, newSchedule, 0, 2);
      
      expect(result).toContain('<!--SR:1,250');
    });

    it('should handle lineStart at beginning of file', () => {
      const text = '单行内容';
      
      const newSchedule: Schedule = {
        interval: 1,
        ease: 250,
        due: new Date('2026-02-19T14:19:56.066Z'),
        reps: 1,
      };
      
      // lineStart=0, insert at beginning
      const result = injectSchedule(text, newSchedule, 0, undefined);
      
      expect(result).toContain('单行内容');
      expect(result).toContain('<!--SR:1,250');
      // SR comment should be first
      expect(result.indexOf('<!--SR:')).toBe(0);
    });
  });

  describe('removeSchedule', () => {
    it('should remove SR comments', () => {
      const text = `问题
答案
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->
其他内容`;
      
      const result = removeSchedule(text);
      
      expect(result).not.toContain('<!--SR:');
      expect(result).toContain('问题');
      expect(result).toContain('答案');
      expect(result).toContain('其他内容');
    });

    it('should remove multiple SR comments', () => {
      const text = `卡片1
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->

卡片2
<!--SR:2,250,2026-02-20T14:19:56.066Z,2-->`;
      
      const result = removeSchedule(text);
      
      expect(result).not.toContain('<!--SR:');
      expect(result).toContain('卡片1');
      expect(result).toContain('卡片2');
    });

    it('should handle text without SR comments', () => {
      const text = `普通文本
没有注释`;
      
      const result = removeSchedule(text);
      
      expect(result).toBe(text);
    });

    it('should remove trailing newline after SR comment', () => {
      const text = `答案\n<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->\n`;
      
      const result = removeSchedule(text);
      
      expect(result).not.toContain('<!--SR:');
      expect(result.trim()).toBe('答案');
    });
  });
});
