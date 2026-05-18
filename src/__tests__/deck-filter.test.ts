/**
 * Tests for MetadataCache filtering optimization
 * Tests getReviewFiles function which uses Obsidian's MetadataCache
 */

import { getReviewFiles, scanVault } from '../deck';
import { App, TFile, CachedMetadata, Vault } from 'obsidian';

// Mock parseNote to avoid parser overhead in scanVault tests
jest.mock('../parser', () => ({
  parseNote: jest.fn((_content: string, filePath: string, _deckTagPrefix: string) => {
    return [{
      id: `${filePath}-1`,
      type: 'cloze' as const,
      content: `Content from ${filePath}`,
      tags: ['test'],
      filePath,
      lineStart: 0,
      lineEnd: 0,
    }];
  }),
}));

// Mock Obsidian's App and metadataCache
function createMockApp(files: Array<{ path: string; cache: CachedMetadata | null }>): App {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const tfileMap = new Map(files.map(f => {
    const file = new TFile();
    file.path = f.path;
    file.extension = 'md';
    return [f.path, file];
  }));
  const tfileList = Array.from(tfileMap.values());

  return {
    vault: {
      getAbstractFileByPath: (path: string) => tfileMap.get(path) || null,
      getMarkdownFiles: () => tfileList,
    },
    metadataCache: {
      fileCache: Object.fromEntries(files.filter(f => f.cache).map(f => [f.path, f.cache])),
      getFileCache: (file: TFile) => {
        const entry = fileMap.get(file.path);
        return entry?.cache || null;
      },
    },
  } as unknown as App;
}

describe('getReviewFiles - MetadataCache optimization', () => {
  it('should filter files with easy-recall/ tag in frontmatter', () => {
    const mockApp = createMockApp([
      {
        path: 'math.md',
        cache: {
          frontmatter: { tags: ['easy-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'history.md',
        cache: {
          frontmatter: { tags: ['easy-recall/history'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'random.md',
        cache: {
          frontmatter: { tags: ['other-tag'] },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toContain('math.md');
    expect(result.map(f => f.path)).toContain('history.md');
    expect(result.map(f => f.path)).not.toContain('random.md');
  });

  it('should filter files with easy-recall/ inline tag', () => {
    const mockApp = createMockApp([
      {
        path: 'note1.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#easy-recall/science' }],
        } as unknown as CachedMetadata,
      },
      {
        path: 'note2.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#other-tag' }],
        } as unknown as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('note1.md');
  });

  it('should include files with easy-recall/ in either frontmatter or inline tags', () => {
    const mockApp = createMockApp([
      {
        path: 'frontmatter-only.md',
        cache: {
          frontmatter: { tags: ['easy-recall/test'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'inline-only.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#easy-recall/test' }],
        } as unknown as CachedMetadata,
      },
      {
        path: 'no-tag.md',
        cache: {
          frontmatter: {},
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toContain('frontmatter-only.md');
    expect(result.map(f => f.path)).toContain('inline-only.md');
    expect(result.map(f => f.path)).not.toContain('no-tag.md');
  });

  it('should include files with missing cache to avoid silently skipping potential review files', () => {
    const mockApp = createMockApp([
      {
        path: 'cached.md',
        cache: {
          frontmatter: { tags: ['easy-recall/test'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'uncached.md',
        cache: null,
      },
    ]);

    const result = getReviewFiles(mockApp);

    // uncached.md is included as a safe fallback when cache is missing
    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toContain('cached.md');
    expect(result.map(f => f.path)).toContain('uncached.md');
  });

  it('should handle array frontmatter tags', () => {
    const mockApp = createMockApp([
      {
        path: 'multi-tag.md',
        cache: {
          frontmatter: { tags: ['daily', 'easy-recall/language'] },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('multi-tag.md');
  });

  it('should handle string frontmatter tags (single tag)', () => {
    const mockApp = createMockApp([
      {
        path: 'single-tag.md',
        cache: {
          frontmatter: { tags: 'easy-recall/test' },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('single-tag.md');
  });

  it('should return empty array when no files have easy-recall tag', () => {
    const mockApp = createMockApp([
      {
        path: 'note1.md',
        cache: {
          frontmatter: { tags: ['other'] },
          tags: [{ tag: '#another' }],
        } as unknown as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(0);
  });

  it('should filter files with a custom deck tag prefix', () => {
    const mockApp = createMockApp([
      {
        path: 'custom.md',
        cache: {
          frontmatter: { tags: ['custom-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'default.md',
        cache: {
          frontmatter: { tags: ['easy-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp, 'custom-recall');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('custom.md');
  });

  it('should work when metadataCache has getFileCache but no fileCache', () => {
    const files = [
      {
        path: 'math.md',
        cache: {
          frontmatter: { tags: ['easy-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'random.md',
        cache: {
          frontmatter: { tags: ['other-tag'] },
          tags: [],
        } as CachedMetadata,
      },
    ];
    const tfileMap = new Map(files.map(f => {
      const file = new TFile();
      file.path = f.path;
      file.extension = 'md';
      return [f.path, file];
    }));
    const fileMap = new Map(files.map(f => [f.path, f]));

    const mockApp = {
      vault: {
        getMarkdownFiles: () => Array.from(tfileMap.values()),
      },
      metadataCache: {
        // No fileCache property at all
        getFileCache: (file: TFile) => {
          const entry = fileMap.get(file.path);
          return entry?.cache || null;
        },
      },
    } as unknown as App;

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('math.md');
  });

  it('should fall back to all markdown files when getFileCache is unavailable', () => {
    const tfile1 = new TFile(); tfile1.path = 'a.md'; tfile1.extension = 'md';
    const tfile2 = new TFile(); tfile2.path = 'b.md'; tfile2.extension = 'md';

    const mockApp = {
      vault: {
        getMarkdownFiles: () => [tfile1, tfile2],
      },
      metadataCache: {
        // No getFileCache at all
      },
    } as unknown as App;

    const result = getReviewFiles(mockApp);

    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toContain('a.md');
    expect(result.map(f => f.path)).toContain('b.md');
  });
});

describe('scanVault', () => {
  it('should parse matching markdown files when app is provided', async () => {
    const reviewFile = new TFile();
    reviewFile.path = 'review.md';
    reviewFile.extension = 'md';

    const otherFile = new TFile();
    otherFile.path = 'other.md';
    otherFile.extension = 'md';

    const mockVault = {
      getMarkdownFiles: () => [reviewFile, otherFile],
      read: jest.fn().mockResolvedValue('test content'),
    } as unknown as Vault;

    const mockApp = {
      vault: mockVault,
      metadataCache: {
        getFileCache: (file: TFile) => {
          if (file.path === 'review.md') {
            return {
              frontmatter: { tags: ['easy-recall/test'] },
              tags: [],
            } as CachedMetadata;
          }
          return {
            frontmatter: { tags: ['other'] },
            tags: [],
          } as CachedMetadata;
        },
      },
    } as unknown as App;

    const cards = await scanVault(mockVault, mockApp);

    expect(cards).toHaveLength(1);
    expect(cards[0].filePath).toBe('review.md');
    expect(mockVault.read).toHaveBeenCalledTimes(1);
    expect(mockVault.read).toHaveBeenCalledWith(reviewFile);
  });

  it('should not read files without matching deck tags when cache is present', async () => {
    const reviewFile = new TFile();
    reviewFile.path = 'review.md';
    reviewFile.extension = 'md';

    const otherFile = new TFile();
    otherFile.path = 'other.md';
    otherFile.extension = 'md';

    const mockVault = {
      getMarkdownFiles: () => [reviewFile, otherFile],
      read: jest.fn().mockResolvedValue('test content'),
    } as unknown as Vault;

    const mockApp = {
      vault: mockVault,
      metadataCache: {
        getFileCache: (file: TFile) => {
          if (file.path === 'review.md') {
            return {
              frontmatter: { tags: ['easy-recall/test'] },
              tags: [],
            } as CachedMetadata;
          }
          return {
            frontmatter: { tags: ['other'] },
            tags: [],
          } as CachedMetadata;
        },
      },
    } as unknown as App;

    await scanVault(mockVault, mockApp);

    expect(mockVault.read).toHaveBeenCalledTimes(1);
    expect(mockVault.read).toHaveBeenCalledWith(reviewFile);
  });

  it('should read files when cache is missing (safe fallback)', async () => {
    const file1 = new TFile();
    file1.path = 'file1.md';
    file1.extension = 'md';

    const mockVault = {
      getMarkdownFiles: () => [file1],
      read: jest.fn().mockResolvedValue('test content'),
    } as unknown as Vault;

    const mockApp = {
      vault: mockVault,
      metadataCache: {
        getFileCache: () => null, // Cache missing for all files
      },
    } as unknown as App;

    const cards = await scanVault(mockVault, mockApp);

    expect(mockVault.read).toHaveBeenCalledTimes(1);
    expect(mockVault.read).toHaveBeenCalledWith(file1);
    expect(cards).toHaveLength(1);
  });
});
