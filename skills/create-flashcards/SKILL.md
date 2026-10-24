---
name: create-flashcards
version: 1.0.1
description: >-
  Turn study material, notes, or articles into easy-recall cloze and Q&A
  flashcards. Use when the user wants to convert highlights, handwritten notes,
  screenshots, or prose into Easy Recall cards (`==cloze==`, `?` Q&A, hint
  callouts, `#easy-recall/` deck tags) for spaced repetition in Obsidian.
---

# create-flashcards

Create well-structured flashcards for the [easy-recall](https://github.com/GenoZhou/easy-recall) Obsidian plugin.

User-facing card syntax lives in `README.md` / `README.zh.md`. Follow that syntax; do not invent markup.

## Optional vault skills

When writing into an Obsidian vault, prefer these if they are available:

1. **obsidian-cli** — read, create, append, or search notes (`obsidian create` / `read` / `append` / `search`)
2. **obsidian-markdown** — YAML frontmatter, `[[wikilinks]]`, `> [!hint]` callouts, and other Obsidian Flavored Markdown

If those skills are missing, write valid easy-recall Markdown directly (vault file or snippet). Do not block on them.

---

## Quick Reference

| Card Type | Syntax |
|-----------|--------|
| Cloze | `==hidden text==` |
| Multi-line cloze | Adjacent cloze lines in one block merge into one card |
| Separate cards | Blank line between blocks |
| Q&A (inline) | `Question?\nAnswer` |
| Q&A (separate) | `Question\n?\nAnswer` (full-width `？` also works) |
| Hint | `> [!hint] content` after the answer |
| Deck tag | `#easy-recall/deck-name` or YAML `tags: [easy-recall/deck-name]` |

A card is a continuous non-empty text block. Blank lines separate cards.

---

## Workflow

### 1. Identify content and destination

Ask the user (or infer from context):

- Deck name (for example `math`, `history`, `cs`)
- Write into an Obsidian vault, or return a Markdown snippet?
- Prefer cloze (definitions, key terms) or Q&A (why / how / procedures)?
- Is the source handwritten notes or an image? If yes, use **exact transcription mode** below.

If writing to a vault with obsidian-cli:

```bash
obsidian create name="Biology Flashcards" content="..." silent
obsidian read file="Biology Flashcards"
obsidian append file="Biology Flashcards" content="..."
obsidian search query="easy-recall"
```

### 2. Choose card type

Use **cloze** for:

- Definitions and fill-in-the-blank facts
- Formulas with a hidden term
- Key terms inside a sentence

Use **Q&A** for:

- Concept explanations
- "Why" and "how" questions
- Multi-step procedures

Use **hints** sparingly for:

- Cards that often fail
- Complex formulas or derivations
- Context that helps without leaking the answer

### 3. Generate cards

One idea per card. Follow these rules:

- **One idea per card**: do not pack two questions into one block
- **Cloze stays in context**: keep enough surrounding text that the blank is answerable alone
- **Adjacent cloze lines merge**: put a blank line between blocks when they should be separate cards
- **Q&A answers stay short**: 1–3 lines
- **Always include a deck tag** at file level (frontmatter or `#easy-recall/...`)
- **Do not add `<!--SR:...-->` comments**: easy-recall writes those after review

Example:

```markdown
---
tags:
  - easy-recall/biology
---

# Biology Flashcards

The ==mitochondria== is the ==powerhouse== of the cell.

What is the primary function of ribosomes?
?
Protein synthesis
> [!hint] Think about where amino acids are assembled
```

Notes:

- Prefer YAML `tags` such as `easy-recall/biology`
- Use `> [!hint]` callouts for optional hints
- Use `[[wikilinks]]` when linking other vault notes

### 4. Write the note

After generating content, write the vault file or return the snippet. With obsidian-cli:

```bash
obsidian create name="Flashcards" content="---
tags:
  - easy-recall/math
---

What is 2+2?
?
4
" silent
```

### 5. Review before delivery

- Every card file has a valid deck tag
- Cloze uses `==...==` with exact intended boundaries
- Multi-line blocks that should be separate cards are split by blank lines
- Q&A questions are clear and answers are short
- Hints help without revealing the answer
- Markdown is valid Obsidian Flavored Markdown
- If using obsidian-cli, confirm the command succeeded

---

## Exact transcription (handwritten notes or images)

When the user provides handwritten notes, photos, or screenshots (especially highlighted text as cloze):

### Step 1: Extract all text

Transcribe every visible character, punctuation, and word order. Do not summarize, paraphrase, or swap synonyms. Keep headings, numbering (`1、` vs `1.`), indentation, and paragraph breaks.

### Step 2: Identify highlights

Find highlighter marks, underlines, bold, or other emphasis. Only the text actually highlighted becomes a cloze.

### Step 3: Create flashcards

Wrap highlighted text with `==…==`. Keep surrounding context so each card stands alone. Do not expand or shrink highlight boundaries.

### Step 4: Check completeness

Compare each line to the source. No items, clozes, or characters missing. Every highlight is a cloze.

### Step 5: Write

Write the vault note or return the Markdown snippet. With obsidian-cli:

```bash
obsidian create name="Transcribed Flashcards" content="..." silent
```

---

## Full examples

### New flashcard note

```markdown
---
tags:
  - easy-recall/biology
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

### Multi-line cloze (one card)

Adjacent cloze lines in the same block merge:

```markdown
Applications:
1. Cold: ==induce sweating==
2. Cough: ==relieve asthma==
```

To make two cards, insert a blank line:

```markdown
1. Cold: ==induce sweating==

2. Cough: ==relieve asthma==
```

### Append to an existing note

```bash
obsidian read file="Biology Flashcards"
obsidian append file="Biology Flashcards" content="\n\nATP is produced in the ==mitochondria== through cellular respiration."
```

---

## Syntax notes

**Cloze** — wrap hidden text with `==`:

```markdown
Traditional Chinese Medicine studies ==human life movement==.
```

Multiple deletions on one line are supported:

```markdown
The ==mitochondria== is the ==powerhouse== of the cell.
```

**Q&A** — question mark at end of line, or `?` / `？` on its own line:

```markdown
What is 2+2?
4

What is the area formula for a circle?
?
S = πr²
```

**Hint** — callout after the answer:

```markdown
What is the formula for the area of a circle?
?
S = πr²
> [!hint] Think about the relationship between radius and area
> π is approximately 3.14159...
```

**Deck tags** — file-level only:

```markdown
---
tags:
  - easy-recall/math
---
```

or `#easy-recall/math` in the body.

**Review comments** — after review, easy-recall injects `<!--SR:...-->` above the card. Do not create or edit those comments.

---

## Starting template

```markdown
---
tags:
  - easy-recall/{{deck_name}}
---

# {{deck_name}} Flashcards

{{cloze_or_qa_card}}

{{next_card}}
```
