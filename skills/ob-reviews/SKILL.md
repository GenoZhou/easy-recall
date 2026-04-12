---
name: ob-reviews
description: Create flashcard notes compatible with the ob-reviews Obsidian plugin. Use when the user wants to convert study materials, notes, or articles into ob-reviews flashcard format, create cloze deletion cards, Q&A cards, deck tags, or hints for spaced repetition review in Obsidian.
---

# ob-reviews Flashcard Maker

Create well-structured flashcards for the [ob-reviews](https://github.com/gengxiankun-gene/ob-reviews) Obsidian plugin.

## Required Skills

When creating or modifying Obsidian notes, always use:

- **obsidian-cli** — to read, create, append, or search notes in an Obsidian vault via the `obsidian` CLI.
- **obsidian-markdown** — to ensure the note uses valid Obsidian Flavored Markdown (frontmatter, wikilinks, callouts, tags, embeds, etc.).

## Quick Reference

| Card Type | Syntax |
|-----------|--------|
| Cloze | `==hidden text==` |
| Q&A (inline) | `Question?\nAnswer` |
| Q&A (separate) | `Question\n?\nAnswer` |
| Hint | `> [!hint] content` |
| Deck tag | `#ob-reviews/deck-name` or YAML frontmatter |

## Workflow

### 1. Identify Content to Convert

Ask the user (or infer from context):
- What deck name should be used? (e.g., `math`, `history`, `cs`)
- Should the output be written directly to an Obsidian vault or returned as snippets?
- What card types are preferred? (cloze for definitions, Q&A for conceptual questions)
- Is the source handwritten notes or an image? If so, switch to **exact transcription mode** (see below).

If writing to a vault, use `obsidian-cli` commands such as:

```bash
obsidian create name="Biology Flashcards" content="..." silent
obsidian append file="Biology Flashcards" content="..."
```

### 2. Choose Card Types

Use **cloze** for:
- Definitions and fill-in-the-blank facts
- Formulas with variables
- Key terms in sentences

Use **Q&A** for:
- Conceptual explanations
- "Why" and "How" questions
- Multi-step procedures

Use **hints** sparingly for:
- Cards that are frequently failed
- Complex formulas or derivations
- Context that helps without giving away the answer

### 3. Generate Cards

For each piece of information, create one card. Follow these rules:

- **One idea per card**: avoid double-barreled questions
- **Cloze cards must fit on a single line**
- **Q&A answers can be 1-3 lines maximum**
- **Always include a deck tag** at the top of the file
- **Do NOT add `<!--SR:...-->` comments**: ob-reviews generates these automatically

When building the note content, follow `obsidian-markdown` conventions:
- Use YAML frontmatter for `tags` (e.g., `ob-reviews/biology`).
- Use standard Markdown for structure.
- Use `> [!hint]` callouts for hints.
- Use `[[wikilinks]]` for vault-internal references if relevant.

### 4. Review and Refine

Before delivering output or writing to a vault:
- Verify every card has a valid deck tag
- Ensure cloze syntax uses `==` exactly
- Check that Q&A cards have a clear question and concise answer
- Confirm hints are helpful but not revealing
- Validate that the note content conforms to Obsidian Flavored Markdown

## Transcribing from Handwritten Notes or Images

When the user provides handwritten notes, photos, or screenshots and asks to convert them into flashcards (especially with highlighted portions as cloze deletions), follow these **exact transcription rules**:

1. **Transcribe verbatim**: keep every original character, punctuation mark, and word order. Do not summarize, rephrase, or substitute synonyms.
2. **Highlight boundaries are exact cloze boundaries**: only the text covered by the user's highlight (e.g., fluorescent marker, underline) should be wrapped in `==…==`. Do not expand or shrink the highlighted region.
3. **Preserve original structure**: keep the original headings, numbering style (`1、` vs `1.`), indentation, and paragraph breaks. Do not "standardize" the layout for the user.
4. **Cross-check completeness**: after generation, compare every line against the source to ensure no items, clozes, or characters are missing.

## Complete Example

```markdown
---
tags:
  - ob-reviews/biology
---

# Biology Flashcards

The ==mitochondria== is the ==powerhouse== of the cell.

What is the primary function of ribosomes?
?
Protein synthesis
> [!hint] Think about where amino acids are assembled

DNA replication occurs in the ==nucleus== of eukaryotic cells.

What is the difference between mitosis and meiosis?
Mitosis produces two identical diploid cells; meiosis produces four genetically unique haploid cells.
```

## Reference

For full syntax details, see [references/syntax-guide.md](references/syntax-guide.md).
For a starter template, see [assets/flashcard-template.md](assets/flashcard-template.md).
