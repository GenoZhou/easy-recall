# ob-reviews Flashcard Syntax Reference

## Card Types

### 1. Cloze Deletion Cards

Wrap the hidden text with `==`:

```markdown
Traditional Chinese Medicine studies ==human life movement==.
```

Multiple cloze deletions in one line are supported:

```markdown
The ==mitochondria== is the ==powerhouse== of the cell.
```

### 2. Q&A Cards

**Format A**: Question mark at end of line

```markdown
What is 2+2?
4
```

**Format B**: Question mark on its own line (supports full-width `？`)

```markdown
What is the area formula for a circle?
?
S = πr²
```

### 3. Optional Hints

Add a hint callout after the answer:

```markdown
What is the formula for the area of a circle?
?
S = πr²
> [!hint] Think about the relationship between radius and area
> π is approximately 3.14159...
```

## Deck Tags

Cards must belong to a deck. Define at file level:

**YAML frontmatter** (recommended):

```markdown
---
tags:
  - ob-reviews/math
---
```

**Inline tag**:

```markdown
#ob-reviews/math
```

## Review Data Format

After reviewing, ob-reviews injects an HTML comment before the card:

```markdown
<!--SR:interval,ease,due,reps-->
==human life movement==
```

- `interval`: days until next review
- `ease`: 130-350, affects interval growth
- `due`: ISO 8601 datetime
- `reps`: consecutive successful reviews

Do NOT manually create or edit these comments.
