import {
  parseNote,
  extractSchedule,
  extractFileDeckTag,
  hasCloze,
  extractClozeAnswers,
  renderClozeContent,
  renderQAContent,
} from '../parser';
import { Card } from '../types';

describe('parser', () => {
  describe('extractSchedule', () => {
    it('should extract SM-2 schedule from SR comment (old format)', () => {
      const text = '<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->';
      const schedule = extractSchedule(text);
      
      expect(schedule).not.toBeNull();
      expect(schedule!.interval).toBe(1);
      expect(schedule!.ease).toBe(250);
      expect(schedule!.reps).toBe(1);
      expect(schedule!.due).toEqual(new Date('2026-02-19T14:19:56.066Z'));
    });

    it('should extract FSRS schedule from SR comment (new format)', () => {
      const text = '<!--SR:0.25,5,0.25,2026-02-26T16:16:11.415Z,1,0-->';
      const schedule = extractSchedule(text);
      
      expect(schedule).not.toBeNull();
      expect(schedule!.interval).toBe(0.25);
      expect(schedule!.difficulty).toBe(5);
      expect(schedule!.stability).toBe(0.25);
      expect(schedule!.reps).toBe(1);
      expect(schedule!.lapses).toBe(0);
      expect(schedule!.algorithm).toBe('fsrs');
      expect(schedule!.due).toEqual(new Date('2026-02-26T16:16:11.415Z'));
    });

    it('should return null for non-SR comment', () => {
      const text = '<!-- some other comment -->';
      const schedule = extractSchedule(text);
      expect(schedule).toBeNull();
    });

    it('should handle float interval (SM-2)', () => {
      const text = '<!--SR:2.5,250,2026-02-19T14:19:56.066Z,3-->';
      const schedule = extractSchedule(text);
      expect(schedule!.interval).toBe(2.5);
    });
  });

  describe('extractFileDeckTag', () => {
    it('should extract tag from YAML frontmatter', () => {
      const content = `---
tags:
  - ob-reviews/math
---

Some content`;
      const tag = extractFileDeckTag(content);
      expect(tag).toBe('math');
    });

    it('should extract tag from inline tag', () => {
      const content = `#ob-reviews/history

Some content`;
      const tag = extractFileDeckTag(content);
      expect(tag).toBe('history');
    });

    it('should return null if no ob-reviews tag', () => {
      const content = `Some content without tag`;
      const tag = extractFileDeckTag(content);
      expect(tag).toBeNull();
    });

    it('should extract Chinese tag from inline tag', () => {
      const content = `#ob-reviews/中文

Some content`;
      const tag = extractFileDeckTag(content);
      expect(tag).toBe('中文');
    });

    it('should extract Chinese tag from YAML frontmatter', () => {
      const content = `---
tags:
  - ob-reviews/中文
---

Some content`;
      const tag = extractFileDeckTag(content);
      expect(tag).toBe('中文');
    });

    it('should extract mixed Chinese-English tag', () => {
      const content = `#ob-reviews/中文-english-混合

Some content`;
      const tag = extractFileDeckTag(content);
      expect(tag).toBe('中文-english-混合');
    });
  });

  describe('hasCloze', () => {
    it('should detect cloze syntax', () => {
      expect(hasCloze('This is ==cloze== text')).toBe(true);
      expect(hasCloze('No cloze here')).toBe(false);
    });
  });

  describe('extractClozeAnswers', () => {
    it('should extract cloze answers', () => {
      const text = '中医学是研究==人体生命运动==、==健康与疾病==的科学';
      const answers = extractClozeAnswers(text);
      expect(answers).toBe('人体生命运动 / 健康与疾病');
    });

    it('should handle single cloze', () => {
      const text = '答案是==42==';
      const answers = extractClozeAnswers(text);
      expect(answers).toBe('42');
    });
  });

  describe('parseNote - Cloze cards', () => {
    it('should parse cloze card with schedule', () => {
      const content = `---
tags:
  - ob-reviews/test
---

<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->
中医学是研究==人体生命运动==的科学。`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe('cloze');
      expect(cards[0].content).toBe('中医学是研究==人体生命运动==的科学。');
      expect(cards[0].tags).toContain('test');
      expect(cards[0].schedule).not.toBeUndefined();
      expect(cards[0].schedule!.interval).toBe(1);
    });

    it('should parse multiple cloze cards', () => {
      const content = `---
tags:
  - ob-reviews/test
---

第一行==答案1==内容。
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->

第二行==答案2==内容。
<!--SR:2,250,2026-02-20T14:19:56.066Z,2-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(2);
      expect(cards[0].content).toContain('答案1');
      expect(cards[1].content).toContain('答案2');
    });

    it('should return empty array without ob-reviews tag', () => {
      const content = `Some ==cloze== text without tag`;
      const cards = parseNote(content, 'test.md');
      expect(cards).toHaveLength(0);
    });
  });

  describe('parseNote - QA cards', () => {
    it('should parse QA card with ? on separate line', () => {
      const content = `---
tags:
  - ob-reviews/test
---

《黄帝内经》的成书时期
?
成书于战国至秦汉时期
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe('qa');
      expect(cards[0].question).toBe('《黄帝内经》的成书时期');
      expect(cards[0].answer).toBe('成书于战国至秦汉时期');
      expect(cards[0].content).toBe('《黄帝内经》的成书时期\n?\n成书于战国至秦汉时期');
    });

    it('should parse QA card with ? at end of question line', () => {
      const content = `---
tags:
  - ob-reviews/test
---

什么是 2+2?
4
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe('qa');
      expect(cards[0].question).toBe('什么是 2+2');
      expect(cards[0].answer).toBe('4');
    });

    it('should parse QA card with multi-line answer', () => {
      const content = `---
tags:
  - ob-reviews/test
---

问题的答案是什么?
第一行答案
第二行答案
第三行答案
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(1);
      expect(cards[0].answer).toBe('第一行答案\n第二行答案\n第三行答案');
    });

    it('should parse QA card with full-width question mark (？)', () => {
      const content = `---
tags:
  - ob-reviews/test
---

什么是全角问号？
这是答案
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe('qa');
      expect(cards[0].question).toBe('什么是全角问号');
      expect(cards[0].answer).toBe('这是答案');
    });

    it('should parse QA card with full-width question mark on separate line', () => {
      const content = `---
tags:
  - ob-reviews/test
---

问题在这里
？
答案在这里
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe('qa');
      expect(cards[0].question).toBe('问题在这里');
      expect(cards[0].answer).toBe('答案在这里');
      expect(cards[0].content).toBe('问题在这里\n？\n答案在这里');
    });

    it('should NOT include SR comment in QA answer (bug fix)', () => {
      const content = `---
tags:
  - ob-reviews/test
---

《黄帝内经》的成书时期
?
成书于战国至秦汉时期
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->`;

      const cards = parseNote(content, 'test.md');
      
      // 这是关键测试：确保 SR 注释不会被当作答案的一部分
      expect(cards[0].answer).toBe('成书于战国至秦汉时期');
      expect(cards[0].answer).not.toContain('<!--SR:');
      expect(cards[0].content).toBe('《黄帝内经》的成书时期\n?\n成书于战国至秦汉时期');
      expect(cards[0].content).not.toContain('<!--SR:');
    });

    it('should parse mixed cloze and QA cards', () => {
      const content = `---
tags:
  - ob-reviews/test
---

中医学是研究==人体生命运动==的科学。
<!--SR:1,250,2026-02-19T14:19:56.066Z,1-->

《黄帝内经》的成书时期
?
成书于战国至秦汉时期
<!--SR:2,250,2026-02-20T14:19:56.066Z,2-->`;

      const cards = parseNote(content, 'test.md');
      
      expect(cards).toHaveLength(2);
      expect(cards[0].type).toBe('cloze');
      expect(cards[1].type).toBe('qa');
    });
  });

  describe('renderClozeContent', () => {
    it('should hide cloze when not showing answer', () => {
      const content = 'This is ==hidden== text';
      const rendered = renderClozeContent(content, false);
      expect(rendered).toContain('obr-cloze-hidden');
      expect(rendered).not.toContain('obr-cloze-show');
    });

    it('should show cloze when showing answer', () => {
      const content = 'This is ==visible== text';
      const rendered = renderClozeContent(content, true);
      expect(rendered).toContain('obr-cloze-show');
      expect(rendered).not.toContain('obr-cloze-hidden');
    });
  });

  describe('renderQAContent', () => {
    it('should show only question when not showing answer', () => {
      const rendered = renderQAContent('Question?', 'Answer', false);
      expect(rendered).toContain('Question?');
      expect(rendered).not.toContain('Answer');
    });

    it('should show question and answer when showing answer', () => {
      const rendered = renderQAContent('Question?', 'Answer', true);
      expect(rendered).toContain('Question?');
      expect(rendered).toContain('Answer');
    });
  });
});
