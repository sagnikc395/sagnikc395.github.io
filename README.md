# sagnikc395.github.io

personal website and blog.

## Notes

`/notes` holds my write-ups of the references in `reading/READING_LIST.md`. One
Markdown file per reference, in `src/notes/<slug>.md`, and the filename is the
URL:

```markdown
---
title: "DAgger: imitation learning as no-regret online learning"
date: 2026-09-10
paper: https://proceedings.mlr.press/v15/ross11a/ross11a.pdf
authors: Ross, Gordon and Bagnell, AISTATS 2011
venue: CS690S
tags: [imitation-learning, dagger]
draft: false
references:
  - title: "Efficient Reductions for Imitation Learning (SMILe)"
    url: https://proceedings.mlr.press/v9/ross10a/ross10a.pdf
    author: Ross and Bagnell, 2010
---

## The problem it is solving

…
```

Only `title` and `date` are required. `paper` is what ties the note to its
reading-list row — the row grows a "notes" link, and the note page shows the
source. arXiv `/abs` and `/pdf` URLs (and `vN` suffixes) match each other, so
the two files do not have to agree on the exact link. `draft: true` keeps a note
out of the index, the search palette and the build.

`npm run check:notes` checks the frontmatter, catches two notes claiming the
same paper, and warns about a `paper:` URL that is not on the reading list.
