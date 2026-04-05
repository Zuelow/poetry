#!/usr/bin/env node
/**
 * Dead-simple poem-to-HTML builder.
 * Reads every .md in /poems, spits out a static site in /public.
 *
 * Poem format (frontmatter + body):
 *   ---
 *   title: My Poem
 *   date: 2026-04-05
 *   tags: [love, night]
 *   ---
 *   your actual poem lines here
 */

const fs = require("fs");
const path = require("path");

const POEMS_DIR = path.join(__dirname, "poems");
const PUBLIC_DIR = path.join(__dirname, "public");

// --- helpers ---

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: { title: "Untitled", date: "unknown", tags: [] }, body: raw.trim() };

  const metaBlock = match[1];
  const body = match[2].trim();
  const meta = { title: "Untitled", date: "unknown", tags: [] };

  for (const line of metaBlock.split("\n")) {
    const [key, ...rest] = line.split(":");
    const val = rest.join(":").trim();
    if (key.trim() === "title") meta.title = val;
    if (key.trim() === "date") meta.date = val;
    if (key.trim() === "tags") {
      meta.tags = val.replace(/[\[\]]/g, "").split(",").map(t => t.trim()).filter(Boolean);
    }
  }
  return { meta, body };
}

function poemToHtml(body) {
  // preserve stanza breaks (double newline) and line breaks
  return body
    .split("\n\n")
    .map(stanza =>
      `<div class="stanza">${stanza
        .split("\n")
        .map(line => `<span class="line">${escHtml(line)}</span>`)
        .join("\n")}</div>`
    )
    .join("\n");
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slug(filename) {
  return path.basename(filename, ".md");
}

// --- css ---

const CSS = `
:root {
  --bg: #0d0d0d;
  --fg: #e0d8c8;
  --accent: #c9a84c;
  --muted: #6b6456;
  --font: "EB Garamond", "Georgia", serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  line-height: 1.8;
  min-height: 100vh;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.container { max-width: 640px; margin: 0 auto; padding: 3rem 1.5rem; }

/* --- index --- */
header {
  text-align: center;
  margin-bottom: 4rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--muted);
}
header h1 {
  font-size: 2.4rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--accent);
}
header p {
  margin-top: 0.5rem;
  color: var(--muted);
  font-style: italic;
  font-size: 1.05rem;
}

.poem-list { list-style: none; }
.poem-list li {
  margin-bottom: 1.8rem;
}
.poem-list .poem-title {
  font-size: 1.3rem;
  display: block;
}
.poem-list .poem-date {
  font-size: 0.85rem;
  color: var(--muted);
}
.poem-list .poem-tags {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.2rem;
}
.poem-list .poem-tags span {
  background: rgba(201,168,76,0.1);
  padding: 0.1em 0.5em;
  border-radius: 3px;
  margin-right: 0.4em;
}

/* --- tags page --- */
.tag-section { margin-bottom: 2.5rem; }
.tag-section h2 {
  color: var(--accent);
  font-weight: 400;
  font-size: 1.3rem;
  margin-bottom: 0.8rem;
  border-bottom: 1px solid var(--muted);
  padding-bottom: 0.3rem;
}

/* --- single poem --- */
.poem-header {
  text-align: center;
  margin-bottom: 3rem;
}
.poem-header h1 {
  font-size: 2rem;
  font-weight: 400;
  color: var(--accent);
}
.poem-header .meta {
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.poem-body .stanza {
  margin-bottom: 2rem;
}
.poem-body .line {
  display: block;
  font-size: 1.15rem;
}

.back {
  display: inline-block;
  margin-top: 3rem;
  color: var(--muted);
  font-size: 0.9rem;
}
.back:hover { color: var(--accent); }

nav.site-nav {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}
nav.site-nav a { margin: 0 1rem; }

footer {
  text-align: center;
  margin-top: 4rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--muted);
  color: var(--muted);
  font-size: 0.8rem;
}
`;

// --- templates ---

function htmlShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
</body>
</html>`;
}

// --- build ---

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const files = fs.readdirSync(POEMS_DIR).filter(f => f.endsWith(".md"));
const poems = files.map(f => {
  const raw = fs.readFileSync(path.join(POEMS_DIR, f), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  return { ...meta, body, slug: slug(f), file: f };
}).sort((a, b) => (b.date > a.date ? 1 : -1));

// collect all tags
const tagMap = {};
for (const p of poems) {
  for (const t of p.tags) {
    if (!tagMap[t]) tagMap[t] = [];
    tagMap[t].push(p);
  }
}

// build individual poem pages
for (const p of poems) {
  const tagHtml = p.tags.map(t => `<a href="/tags#${t}">#${t}</a>`).join(" ");
  const page = htmlShell(p.title, `
    <nav class="site-nav"><a href="/">poems</a> <a href="/tags">tags</a></nav>
    <div class="poem-header">
      <h1>${escHtml(p.title)}</h1>
      <div class="meta">${p.date} ${tagHtml ? "&mdash; " + tagHtml : ""}</div>
    </div>
    <div class="poem-body">
      ${poemToHtml(p.body)}
    </div>
    <a class="back" href="/">&larr; all poems</a>
    <footer>&copy; Kasper Z&uuml;low</footer>
  `);
  fs.writeFileSync(path.join(PUBLIC_DIR, `${p.slug}.html`), page);
}

// build index
const listItems = poems.map(p => {
  const tagSpans = p.tags.map(t => `<span>#${t}</span>`).join(" ");
  return `<li>
    <a class="poem-title" href="/${p.slug}">${escHtml(p.title)}</a>
    <span class="poem-date">${p.date}</span>
    ${tagSpans ? `<div class="poem-tags">${tagSpans}</div>` : ""}
  </li>`;
}).join("\n");

const indexPage = htmlShell("poetry — kasper zülow", `
  <header>
    <h1>poetry</h1>
    <p>kasper z&uuml;low</p>
  </header>
  <nav class="site-nav"><a href="/">poems</a> <a href="/tags">tags</a></nav>
  <ul class="poem-list">
    ${listItems}
  </ul>
  <footer>&copy; Kasper Z&uuml;low</footer>
`);
fs.writeFileSync(path.join(PUBLIC_DIR, "index.html"), indexPage);

// build tags page
const tagSections = Object.keys(tagMap).sort().map(tag => {
  const items = tagMap[tag].map(p =>
    `<li><a class="poem-title" href="/${p.slug}">${escHtml(p.title)}</a> <span class="poem-date">${p.date}</span></li>`
  ).join("\n");
  return `<div class="tag-section" id="${tag}"><h2>#${tag}</h2><ul class="poem-list">${items}</ul></div>`;
}).join("\n");

const tagsPage = htmlShell("tags — kasper zülow", `
  <nav class="site-nav"><a href="/">poems</a> <a href="/tags">tags</a></nav>
  <header>
    <h1>tags</h1>
  </header>
  ${tagSections}
  <footer>&copy; Kasper Z&uuml;low</footer>
`);
fs.writeFileSync(path.join(PUBLIC_DIR, "tags.html"), tagsPage);

console.log(`Built ${poems.length} poem(s) → /public`);
