const roots = {
  about: document.getElementById("about-root"),
  publications: document.getElementById("publications-root"),
  research: document.getElementById("research-root"),
  writing: document.getElementById("writing-root"),
  contact: document.getElementById("contact-root"),
};

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripNumericPrefix(value) {
  return value.replace(/^\d+\-/, "");
}

function baseName(path) {
  const file = path.split("/").pop() || path;
  return file.replace(/\.md$/i, "");
}

function filenameSortKey(path) {
  return stripNumericPrefix(baseName(path)).toLowerCase();
}

function leadingNumericPrefix(path) {
  const match = baseName(path).match(/^(\d+)-/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function externalLink(href, label) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function renderDescription(description) {
  if (!description) {
    return "";
  }

  return description
    .split("\\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { data: {}, body: markdown };
  }

  const closing = markdown.indexOf("\n---", 3);
  if (closing === -1) {
    return { data: {}, body: markdown };
  }

  const raw = markdown.slice(3, closing).trim();
  const body = markdown.slice(closing + 4).trim();
  const data = {};
  let activeListKey = null;

  for (const line of raw.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    if (/^\s*-\s+/.test(line) && activeListKey) {
      data[activeListKey].push(
        line
          .replace(/^\s*-\s+/, "")
          .trim()
          .replace(/^"(.*)"$/, "$1")
      );
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      activeListKey = null;
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (!value) {
      data[key] = [];
      activeListKey = key;
      continue;
    }

    activeListKey = null;

    if (/^\d+$/.test(value)) {
      data[key] = Number(value);
    } else if (value === "true" || value === "false") {
      data[key] = value === "true";
    } else {
      data[key] = value.replace(/^"(.*)"$/, "$1");
    }
  }

  return { data, body };
}

function parseTable(lines, startIndex) {
  const header = lines[startIndex];
  const divider = lines[startIndex + 1];

  if (
    !header ||
    !header.includes("|") ||
    !divider ||
    !/^\s*\|?[\s:-]+\|[\s|:-]*$/.test(divider)
  ) {
    return null;
  }

  const rows = [];
  let cursor = startIndex;
  while (cursor < lines.length && lines[cursor].includes("|")) {
    rows.push(lines[cursor]);
    cursor += 1;
  }

  const cells = rows.map((row) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => formatInline(cell.trim()))
  );

  const [headerRow, , ...bodyRows] = cells;
  const html = `
    <table>
      <thead>
        <tr>${headerRow.map((cell) => `<th>${cell}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${bodyRows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  return { html, nextIndex: cursor };
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />')
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function fallbackMarkdownParser(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      html.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const block = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        block.push(lines[index]);
        index += 1;
      }
      html.push(`<pre><code>${escapeHtml(block.join("\n"))}</code></pre>`);
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (
      trimmed.startsWith("<details") ||
      trimmed.startsWith("</details") ||
      trimmed.startsWith("<summary") ||
      trimmed.startsWith("</summary")
    ) {
      html.push(lines[index]);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quote.push(formatInline(lines[index].trim().slice(2)));
        index += 1;
      }
      html.push(`<blockquote>${quote.join(" ")}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(`<li>${formatInline(lines[index].trim().slice(2))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(
          `<li>${formatInline(
            lines[index].trim().replace(/^\d+\.\s+/, "")
          )}</li>`
        );
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim()) {
      const current = lines[index].trim();
      if (
        /^(#{1,4})\s+/.test(current) ||
        /^[-*]\s+/.test(current) ||
        /^\d+\.\s+/.test(current) ||
        current.startsWith("> ") ||
        current.startsWith("```") ||
        current.startsWith("<details") ||
        current.startsWith("<summary") ||
        current.startsWith("</details")
      ) {
        break;
      }
      if (parseTable(lines, index)) {
        break;
      }
      paragraph.push(formatInline(current));
      index += 1;
    }
    html.push(`<p>${paragraph.join(" ")}</p>`);
  }

  return html.join("");
}

function renderMarkdown(markdown) {
  if (window.marked && typeof window.marked.parse === "function") {
    return window.marked.parse(markdown);
  }
  return fallbackMarkdownParser(markdown);
}

async function loadManifest() {
  const response = await fetch("content-manifest.json");
  if (!response.ok) {
    throw new Error("Could not load content manifest.");
  }
  return response.json();
}

async function getMarkdownFile(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  const raw = await response.text();
  const parsed = parseFrontmatter(raw);
  return {
    path,
    filename: path.split("/").pop() || path,
    ...parsed,
  };
}

function datedFilenameValue(path) {
  const match = baseName(path).match(/^(\d{2})-(\d{2})-(\d{4})-/);
  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  return Number(`${year}${month}${day}`);
}

function dateLabelFromFilename(path) {
  const match = baseName(path).match(/^(\d{2})-(\d{2})-(\d{4})-/);
  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function sortByFilename(files) {
  return [...files].sort((a, b) => {
    const aDate = datedFilenameValue(a.path);
    const bDate = datedFilenameValue(b.path);

    if (aDate !== null || bDate !== null) {
      return (bDate || 0) - (aDate || 0);
    }

    const aPrefix = leadingNumericPrefix(a.path);
    const bPrefix = leadingNumericPrefix(b.path);

    if (aPrefix !== null || bPrefix !== null) {
      if (aPrefix === null) return 1;
      if (bPrefix === null) return -1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    }

    return filenameSortKey(a.path).localeCompare(filenameSortKey(b.path));
  });
}

async function getMarkdownCollection(folder, manifest) {
  const normalizedFolder = folder.endsWith("/") ? folder : `${folder}/`;
  const matches = manifest.files.filter(
    (path) => path.startsWith(normalizedFolder) && path.endsWith(".md")
  );
  const loaded = await Promise.all(
    matches.map((path) => getMarkdownFile(path))
  );
  return sortByFilename(loaded);
}

function renderFrontmatterDiagram(data) {
  if (!data.diagram) {
    return "";
  }

  return `
    <figure class="diagram-block">
      <img src="${data.diagram}" alt="${escapeHtml(data.title || "Diagram")}" />
    </figure>
  `;
}

function MarkdownRenderer(entry, className = "markdown-body") {
  return `
    <div class="${className}">
      ${renderFrontmatterDiagram(entry.data)}
      ${renderMarkdown(entry.body)}
    </div>
  `;
}

function AcademicSection(title, content, subtitle = "") {
  return `
    <section class="academic-section">
      <header class="academic-section-header">
        <h3>${title}</h3>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </header>
      ${content}
    </section>
  `;
}

function DetailsBlock(title, content, open = false) {
  return `
    <details class="details-block"${open ? " open" : ""}>
      <summary>${title}</summary>
      <div class="details-body">${content}</div>
    </details>
  `;
}

function renderLinkList(items) {
  if (!items.length) {
    return "";
  }

  return `
    <ul class="link-list">
      ${items
        .map(
          (item) => `
            <li>
              <span>${item.label}</span>
              ${externalLink(item.href, item.value)}
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

async function renderAbout(manifest) {
  if (!roots.about) {
    return;
  }
  const about = await getMarkdownFile("content/about.md");

  roots.about.innerHTML = `
    <div class="about-layout">
      <aside class="about-profile">
        <img
          class="profile-image"
          src="${about.data.photo || "assets/images/profile-placeholder.svg"}"
          alt="${escapeHtml(about.data.name || "Profile photo")}"
        />
      </aside>
      <div class="about-content">
        <header class="about-header">
          <h3>${about.data.name || "Name"}</h3>
          <p class="about-subtitle">${about.data.title || ""}</p>
        </header>
        ${MarkdownRenderer(about)}
      </div>
    </div>
  `;
}

function publicationMeta(entry) {
  const bits = [
    entry.data.authors,
    entry.data.venue,
    entry.data.year,
    entry.data.role,
    entry.data.status,
  ].filter(Boolean);

  return bits.join(" · ");
}

async function renderPublications(manifest) {
  if (!roots.publications) {
    return;
  }
  const publications = await getMarkdownCollection(
    "content/publications",
    manifest
  );

  roots.publications.innerHTML = `
    <ol class="publication-list">
      ${publications
        .map(
          (entry) => `
            <li class="publication-item">
              <article>
                <header class="publication-header">
                  <h3>${
                    entry.data.title || stripNumericPrefix(baseName(entry.path))
                  }</h3>
                  <p class="publication-meta">${publicationMeta(entry)}</p>
                </header>
                ${
                  entry.data.abstract
                    ? `<p class="publication-abstract">${entry.data.abstract}</p>`
                    : ""
                }
                ${MarkdownRenderer(entry)}
                <div class="publication-links">
                  ${
                    entry.data.paper_link
                      ? externalLink(entry.data.paper_link, "Paper")
                      : ""
                  }
                  ${
                    entry.data.notes
                      ? externalLink(entry.data.notes, "Notes")
                      : ""
                  }
                  ${
                    entry.data.slides
                      ? externalLink(entry.data.slides, "Slides")
                      : ""
                  }
                </div>
              </article>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function renderCollectionAsDetails(entries, openFirst = false) {
  return entries
    .map((entry, index) =>
      DetailsBlock(
        entry.data.title ||
          stripNumericPrefix(baseName(entry.path)).replace(/\-/g, " "),
        `
          ${
            entry.data.subtitle
              ? `<p class="details-subtitle">${entry.data.subtitle}</p>`
              : ""
          }
          ${MarkdownRenderer(entry)}
        `,
        openFirst && index === 0
      )
    )
    .join("");
}

function renderTopicDetails(entries) {
  return entries
    .map((entry) =>
      DetailsBlock(
        entry.data.title ||
          stripNumericPrefix(baseName(entry.path)).replace(/\-/g, " "),
        `
          ${
            entry.data.subtitle
              ? `<p class="details-subtitle">${entry.data.subtitle}</p>`
              : ""
          }
          ${MarkdownRenderer(entry)}
          <p class="artifact-line">
            ${entry.data.notes ? externalLink(entry.data.notes, "Notes") : ""}
          </p>
        `
      )
    )
    .join("");
}

async function renderReadingLog(logFolder, manifest, options = {}) {
  const indexEntry = await getMarkdownFile(`${logFolder}/index.md`);
  const sectionEntries = await getMarkdownCollection(
    `${logFolder}/sections`,
    manifest
  );
  const topicEntries = options.topicFolder
    ? await getMarkdownCollection(`${logFolder}/topics`, manifest)
    : [];

  const renderedSections = sectionEntries.map((entry) => {
    const title =
      entry.data.title ||
      stripNumericPrefix(baseName(entry.path)).replace(/\-/g, " ");
    const isTopicsSection =
      options.topicFolder && title.toLowerCase().includes("topics i studied");

    const nestedTopics =
      isTopicsSection && topicEntries.length
        ? `
        <div class="topic-section">
          <div class="topic-list">
            ${renderTopicDetails(topicEntries)}
          </div>
        </div>
      `
        : "";

    return DetailsBlock(
      title,
      `
        ${
          entry.data.subtitle
            ? `<p class="details-subtitle">${entry.data.subtitle}</p>`
            : ""
        }
        ${MarkdownRenderer(entry)}
        ${nestedTopics}
      `
    );
  });

  return DetailsBlock(
    indexEntry.data.title || stripNumericPrefix(baseName(logFolder)),
    `
      ${
        indexEntry.data.subtitle
          ? `<p class="log-subtitle">${indexEntry.data.subtitle}</p>`
          : ""
      }
      ${MarkdownRenderer(indexEntry)}
      <div class="reading-log-sections">
        ${renderedSections.join("")}
      </div>
    `,
    options.open === true
  );
}

async function renderResearchNarrative(manifest) {
  if (!roots.research) {
    return;
  }
  const das = await renderReadingLog(
    "content/research/das-reading-log",
    manifest,
    {
      topicFolder: false,
      open: false,
    }
  );
  const consensus = await renderReadingLog(
    "content/research/consensus-reading-log",
    manifest,
    { open: true, topicFolder: true }
  );

  roots.research.innerHTML = `
    <div class="research-intro">
      <p>
        This section is organized as reading logs rather than as project cards.
        The emphasis is on why a reading path started, what changed in my
        understanding, and what open question remained after each cluster.
      </p>
    </div>
    <div class="reading-log-list">
      ${das}
      ${consensus}
    </div>
  `;
}

async function renderWriting(manifest) {
  if (!roots.writing) {
    return;
  }
  const entries = await getMarkdownCollection("content/writing", manifest);

  roots.writing.innerHTML = `
    <ol class="writing-list">
      ${entries
        .map(
          (entry) => `
            <li class="writing-item">
              <div class="writing-main">
                <h3>${
                  entry.data.title || stripNumericPrefix(baseName(entry.path))
                }</h3>
                <p class="writing-meta">
                  ${[
                    dateLabelFromFilename(entry.path) || entry.data.year,
                    entry.data.platform,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                ${renderDescription(entry.data.description)}
              </div>
              <div class="writing-link">
                ${entry.data.link ? externalLink(entry.data.link, "Read") : ""}
              </div>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

async function renderContact() {
  if (!roots.contact) {
    return;
  }
  const contact = await getMarkdownFile("content/contact.md");
  roots.contact.innerHTML = MarkdownRenderer(contact);
}

function renderError(root, error) {
  if (!root) {
    return;
  }
  root.innerHTML = `<p class="error-block">${escapeHtml(error.message)}</p>`;
}

function highlightToken(token) {
  const keywords = new Set([
    "if",
    "else",
    "repeat",
    "wait",
    "until",
    "broadcast",
    "on",
    "receipt",
    "from",
    "distinct",
    "processes",
    "decide",
    "return",
    "while",
    "for",
    "function",
    "let",
    "const",
  ]);

  if (/^\d+$/.test(token)) {
    return `<span class="code-number">${token}</span>`;
  }

  if (keywords.has(token)) {
    return `<span class="code-keyword">${token}</span>`;
  }

  if (/^(EST|AUX|B_VAL|BV|QC|PREPARE|COMMIT)$/.test(token)) {
    return `<span class="code-constant">${token}</span>`;
  }

  if (/^(:=|!=|==|<=|>=|[≤≥∪{}()[\]+\-*/=])$/.test(token)) {
    return `<span class="code-operator">${escapeHtml(token)}</span>`;
  }

  return escapeHtml(token);
}

function localHighlightCode(block) {
  const text = block.textContent;
  const tokens = text.split(/([A-Za-z_][A-Za-z0-9_]*|\d+|:=|!=|==|<=|>=|[≤≥∪{}()[\]+\-*/=])/g);
  block.innerHTML = tokens.map((token) => highlightToken(token)).join("");
  block.classList.add("local-highlight");
}

function highlightCodeBlocks() {
  document.querySelectorAll("pre code").forEach((block) => {
    localHighlightCode(block);
  });
}

async function init() {
  try {
    const manifest = await loadManifest();
    const tasks = [];
    if (roots.about) {
      tasks.push(
        renderAbout(manifest).catch((error) => renderError(roots.about, error))
      );
    }
    if (roots.publications) {
      tasks.push(
        renderPublications(manifest).catch((error) =>
          renderError(roots.publications, error)
        )
      );
    }
    if (roots.research) {
      tasks.push(
        renderResearchNarrative(manifest).catch((error) =>
          renderError(roots.research, error)
        )
      );
    }
    if (roots.writing) {
      tasks.push(
        renderWriting(manifest).catch((error) =>
          renderError(roots.writing, error)
        )
      );
    }
    if (roots.contact) {
      tasks.push(
        renderContact().catch((error) => renderError(roots.contact, error))
      );
    }
    await Promise.all(tasks);
    highlightCodeBlocks();
  } catch (error) {
    Object.values(roots).forEach((root) => {
      if (root) {
        renderError(root, error);
      }
    });
  }
}

init();
