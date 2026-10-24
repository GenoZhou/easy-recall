---
name: create-flashcards
version: 1.0.1
description: >-
  Create or append easy-recall Obsidian flashcards (cloze with ==…==, optional
  [!hint] mnemonics) from study notes, PDFs, or handwritten images. Use when
  the user asks for flashcards, 闪卡, easy-recall cards, or to add cloze cards
  to a flashcard note.
---

# Create Flashcards

Turn study material into markdown cloze cards for the easy-recall plugin.

## Workflow

1. **Target** — Prefer the note open in Obsidian. Otherwise use/create `flashcards/<subject>/<topic>.md` (e.g. `flashcards/中药学/理气药.md`). Append unless asked to rewrite.
2. **Source** — Typed text: extract facts. PDF/scan: rasterize pages → read images (OCR optional) → transcribe. Flag illegible characters. 口诀以识别字迹为准不瞎编。
3. **Cloze** — Wrap only what should be recalled (see below). Preserve source wording, numbering, and parentheticals.
4. **Write** — Re-read the target note before each Edit/Write if the user may be editing it in Obsidian concurrently. Match the entry layout: one contiguous block per herb, `> [!hint]` at the end, no blank lines around headings, and only one existing `<!--SR:…-->` comment per block. Do not invent `<!--SR:…-->` (plugin owns scheduling).

## Note structure

```yaml
---
tags:
  - easy-recall/中药   # or easy-recall/中医基础理论, etc.
---
```

- Do **not** put the filename/topic as a body heading (no `# 理气药` inside `理气药.md`).
- Match the note's existing heading style. If the note is new or empty, choose one pattern and keep it consistent:
  - One herb per top-level heading: `# 陈皮`, `# 大黄`.
  - Category group with nested herbs: `# 清热泻火药 <!--easy-recall-hide-->`, then `## 知母`.
  - Note with an overview / 概述 section: `# 概述`, then category headings at the same level as the overview (`# 温化寒痰药`), and herbs nested under categories (`## 半夏`).
- Do not leave blank lines immediately before or after headings.

## Cloze rules

- Syntax: `==答案==`. Each pair is one recall prompt.
- **No punctuation inside cloze** — `，` `、` `；` `。` `：` `（）` and similar stay **outside** `==…==`. Split coordinated phrases so each blank is a contiguous answer chunk (review UI shows roughly how many characters).  
  - Wrong: `==凉血止血，清热利尿==`  
  - Right: `==凉血止血==，==清热利尿==`  
  - Wrong: `==大蓟、小蓟、茜草==` → Right: `==大蓟==、==小蓟==、==茜草==`
- **Handwritten with yellow highlight** → cloze **only** highlighted spans (still split on punctuation as above). Never wrap a whole 应用 list just to make one card.
- **No highlights** (typed notes / unmarked text) → cloze the recall targets: 功效 phrases, distinctive labels (要药、归经重点等), key 应用 fragments—mirror nearby flashcard notes in the same subject.
- Under a herb heading, do **not** restate the herb name in the card body (`性味归经：…` not `陈皮的性味归经是：…`).

## Entry layout

Typical 中药 entry (omit missing fields; keep source label `应用：` vs `主治病证：`):

```markdown
# 陈皮
<!--SR:...-->   <!-- keep only the first SR comment if the plugin already generated one; do not invent new ones -->
性味归经：辛、苦，温；归 ==脾==、==肺== 经。
功效：==理气健脾==、==燥湿化痰==。
应用：
① 脾胃气滞证（==平胃散==、==保和丸==）
② 呕吐、呃逆（调畅==中焦==，使之==升降有序==）
③ ==湿痰==、==寒痰==咳嗽，为==治痰要药==（==二陈汤==）
④ 胸痹
> [!hint] 陈皮李琦建澡堂
```

Formatting rules:

- One contiguous block per herb. Do **not** split 性味归经 / 功效 / 应用 / 用法用量 / 注意事项 with blank lines.
- `> [!hint] …` goes at the **end** of the herb block, after all content.
- If the note already has `<!--SR:…-->` scheduling comments, keep only the **first** one per herb block (at the top) and remove duplicates.
- Do not invent new `<!--SR:…-->` comments; the plugin owns scheduling.
- Numbered lists (`①` / `1.`) follow the source; cloze only highlighted (or otherwise key) fragments inside items.

## Comparison entries

When the source contains a comparison (e.g. 川贝母与浙贝母对比, 桑白皮与葶苈子对比), write it as a separate block with **共性** and **个性** explicitly separated:

```markdown
## 川贝母与浙贝母对比
共性：均能==清热化痰==、==散结消痈==，同治==热痰==、==瘰疬==、==乳痈==等。
个性：
川贝母：==甘润==，长于==润肺止咳==，多用于==燥痰==、==肺热燥咳==。
浙贝母：==苦寒==，长于==清热散结==，多用于==热痰==、==风热咳嗽==。
```

- Put common effects / indications in a single **共性** line.
- Put per-herb differences under **个性**, each on its own line.
- Cloze the recall targets in both sections.
