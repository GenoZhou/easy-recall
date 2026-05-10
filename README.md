# ob-reviews

> **English** | [中文](./README.zh.md)

A minimalist spaced repetition plugin focused on core memorization features—zero configuration, just write and review.

![Version](https://img.shields.io/badge/version-1.2.6--beta.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Obsidian](https://img.shields.io/badge/obsidian-0.15%2B-purple)

## Features

- **Zero Configuration** - Start reviewing immediately after installation, no complex setup needed
- **Native Markdown Syntax** - Create cards with `==highlight==` and `?question` syntax, supports full-width question mark `？`
- **File-level Tags** - Define decks with `#ob-reviews/xxx`, supports Chinese tags
- **Three-state Rating** - Again/Hard/Good, simplify decision fatigue
- **Instant Feedback** - "Again" cards go back to queue tail immediately, continue reviewing in current session
- **Multi-language Support** - Auto-adapts to Obsidian language settings (English/Chinese)
- **SuggestModal Deck Selector** - Quick Switcher-like deck selection experience
- **Review Surface Option** - Review in the default modal window or reuse an Obsidian tab
- **Mobile Support** - Perfectly adapted for phones and tablets

## Installation

### Manual Installation

1. Download the latest version of `main.js`, `manifest.json`, `styles.css`
2. Create `.obsidian/plugins/ob-reviews/` directory in your Obsidian Vault
3. Copy the downloaded files to that directory
4. Enable the plugin in Obsidian settings

### From Community Plugin Marketplace (Coming Soon)

Wait for the plugin to be listed on Obsidian Community Plugin Marketplace for direct installation.

## Usage

### Creating Cards

**Rule: Cards must be separated by blank lines.** A card = a continuous non-empty text block.

**Cloze Cards**
```markdown
Traditional Chinese Medicine studies ==human life movement==.
```

**Multi-line Cloze Cards**
Adjacent Cloze lines in the same block are merged into one card:
```markdown
Applications:
1. Cold: ==induce sweating==
2. Cough: ==relieve asthma==
```

To create separate cards, use blank lines:
```markdown
1. Cold: ==induce sweating==

2. Cough: ==relieve asthma==
```

**Q&A Cards**
```markdown
What is 2+2?
4

Or:

What is the area formula for a circle?
?
S = πr²
```

**Cards with Hint (Optional)**
```markdown
What is the formula for the area of a circle?
?
S = πr²
> [!hint] Think about the relationship between radius and area
> π is approximately 3.14159...
```

> 💡 Supports full-width question mark `？`, suitable for Chinese input habits
> 
> 💡 Hint uses Obsidian callout syntax `> [!hint]`, displayed optionally during review

### Defining Decks

Add tags at the beginning of the file:
```markdown
---
tags:
  - ob-reviews/math
---

Card content...
```

Or in the body:
```markdown
#ob-reviews/math

Card content...
```

### Start Reviewing

1. Click the review icon 📚 in the left sidebar, or use command palette to execute "Start Review"
2. Search and select a deck in SuggestModal, or press Enter to review all due cards
3. View the card, press Space on desktop to reveal the hint or answer, or click/tap "Show Hint" / "Show Answer"
4. Select rating:
   - **1 - Again** (🔴): Put back to queue tail immediately, continue reviewing in current session
   - **2 - Hard** (🟠): Interval ×1.2, ease -15
   - **3 - Good** (🔵): Standard interval, ease unchanged

You can also run "Review Due Cards in Current Note" from the command palette in any Markdown note to review only due cards from that note.

By default, each review session includes up to 30 due cards, so cards marked **Again** can return quickly within the same smaller batch. Change **Review Batch Size** in plugin settings to adjust this limit.

By default, reviews open in a modal window. In plugin settings, configure **Desktop Review Interface** and **Mobile Review Interface** separately to use either a modal window or a reusable Obsidian tab on each platform.

## Desktop Shortcuts

Desktop shortcuts work in both the modal window and the reusable Obsidian tab. Space only reveals content; ratings are handled by number keys after the answer is visible.

| Key | Function |
|-----|----------|
| Space | Show hint, then show answer |
| 1 | Again |
| 2 | Hard |
| 3 | Good |

## Data Storage

Review data is stored as HTML comments **before** the card:

```markdown
<!--SR:1,250,2026-02-18T10:00:00Z,1-->
Traditional Chinese Medicine studies ==human life movement==.
```

Format: `<!--SR:interval,ease,due,reps-->`

**Your notes always belong to you**, data does not depend on any external service.

## Algorithm

Simplified SM-2 algorithm:

- **Interval Days**: Dynamically calculated based on rating, maximum 365 days
- **Ease**: 130-350 range, affects interval growth speed
- **Consecutive Success Count**: Affects when new cards enter formal review

## Development

```bash
# Install dependencies
npm install

# Development mode (auto rebuild)
npm run dev

# Build production version
npm run build

# Run tests
npm test

# Test coverage
npm run test:coverage
```

For repository conventions and implementation boundaries, see `AGENTS.md`.

## License

MIT License - See [LICENSE](./LICENSE) file

## Acknowledgements

- Inspired by Anki and Obsidian Spaced Repetition plugin
- Follows Obsidian official plugin development best practices

---

**Made with ❤️ for Obsidian users**
