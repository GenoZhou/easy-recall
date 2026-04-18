jest.mock('obsidian', () => {
  class TFile {
    path = '';
  }

  class MarkdownView {
    editor = {
      setCursor: jest.fn(),
    };
  }

  class Modal {}
  class Component {}
  class Notice {}

  return {
    TFile,
    MarkdownView,
    Modal,
    Component,
    Notice,
    Platform: { isMobile: false },
    MarkdownRenderer: {
      renderMarkdown: jest.fn(),
    },
  };
}, { virtual: true });

import { MarkdownView, TFile } from 'obsidian';
import type { Card } from '../types';
import { buildHeadingPathLabel, openCardSource } from '../ui/review-modal';

describe('review-modal helpers', () => {
  describe('buildHeadingPathLabel', () => {
    it('should build file name and heading path label', () => {
      const card: Card = {
        id: '1',
        type: 'cloze',
        content: '==答案==',
        tags: [],
        filePath: 'docs/中医/方剂.md',
        lineStart: 10,
        lineEnd: 10,
        headingPath: ['第一章', '第二节'],
      };

      expect(buildHeadingPathLabel(card)).toBe('方剂 / 第一章 / 第二节');
    });

    it('should return null when there is no heading path', () => {
      const card: Card = {
        id: '1',
        type: 'qa',
        content: '问题?\n答案',
        question: '问题?',
        answer: '答案',
        tags: [],
        filePath: 'test.md',
        lineStart: 0,
        lineEnd: 1,
      };

      expect(buildHeadingPathLabel(card)).toBeNull();
    });
  });

  describe('openCardSource', () => {
    it('should open file and move cursor to card line', async () => {
      const file = Object.assign(Object.create(TFile.prototype), {
        path: 'cards/test.md',
      });
      const view = Object.assign(Object.create(MarkdownView.prototype), {
        editor: {
          setCursor: jest.fn(),
        },
      });
      const openFile = jest.fn().mockResolvedValue(undefined);
      const revealLeaf = jest.fn().mockResolvedValue(undefined);
      const loadIfDeferred = jest.fn().mockResolvedValue(undefined);

      const leaf = {
        openFile,
        isDeferred: false,
        loadIfDeferred,
        view,
      };

      const app = {
        workspace: {
          getLeaf: jest.fn().mockReturnValue(leaf),
          revealLeaf,
        },
      } as any;

      const vault = {
        getAbstractFileByPath: jest.fn().mockReturnValue(file),
      } as any;

      const card: Card = {
        id: '1',
        type: 'cloze',
        content: '==答案==',
        tags: [],
        filePath: 'cards/test.md',
        lineStart: 12,
        lineEnd: 12,
      };

      const result = await openCardSource(app, vault, card);

      expect(result).toBe(true);
      expect(app.workspace.getLeaf).toHaveBeenCalledWith(false);
      expect(openFile).toHaveBeenCalledWith(file, {
        active: true,
        eState: {
          mode: 'source',
          line: 12,
        },
      });
      expect(revealLeaf).toHaveBeenCalledWith(leaf);
      expect(view.editor.setCursor).toHaveBeenCalledWith({ line: 12, ch: 0 });
      expect(loadIfDeferred).not.toHaveBeenCalled();
    });

    it('should return false when target file is missing', async () => {
      const app = {
        workspace: {
          getLeaf: jest.fn(),
          revealLeaf: jest.fn(),
        },
      } as any;

      const vault = {
        getAbstractFileByPath: jest.fn().mockReturnValue(null),
      } as any;

      const card: Card = {
        id: '1',
        type: 'cloze',
        content: '==答案==',
        tags: [],
        filePath: 'missing.md',
        lineStart: 3,
        lineEnd: 3,
      };

      const result = await openCardSource(app, vault, card);

      expect(result).toBe(false);
      expect(app.workspace.getLeaf).not.toHaveBeenCalled();
    });
  });
});
