# poetry.kasperzuelow.com

Push poems as `.md` files to `/poems` and they auto-deploy.

## Poem format

```markdown
---
title: Your Title Here
date: 2026-04-05
tags: [love, night, whatever]
---

Your poem goes here.
Line breaks are preserved.

Double newlines create stanza breaks.
```

## How it works

1. Push a `.md` file to `poems/`
2. GitHub Actions runs `build.js` → generates static HTML
3. Deploys to Firebase Hosting → live at poetry.kasperzuelow.com
