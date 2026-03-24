#!/usr/bin/env node
/**
 * Converts TEXT part types to STYLED_CONTENT in template files.
 * Only converts parts array items, not intake form fields or other contexts.
 */

import fs from 'fs';

function markdownToStyledHtml(title, body) {
  // Split into sections by **Header** patterns at start of line after \n\n
  let html = '';

  // Process the body paragraph by paragraph
  const paragraphs = body.split('\n\n');

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check if it's a header line (starts with **...**)
    if (/^\*\*(.+?)\*\*$/.test(trimmed)) {
      const headerText = trimmed.match(/^\*\*(.+?)\*\*$/)[1];
      html += `\n<h2 style="color: var(--steady-warm-500); border-bottom: 2px solid var(--steady-teal); padding-bottom: 4px; margin-bottom: 12px;">${escapeHtml(headerText)}</h2>`;
      continue;
    }

    // Check if it starts with a bold header followed by content
    if (/^\*\*(.+?)\*\*\n/.test(trimmed)) {
      const lines = trimmed.split('\n');
      const headerMatch = lines[0].match(/^\*\*(.+?)\*\*$/);
      if (headerMatch) {
        html += `\n<h2 style="color: var(--steady-warm-500); border-bottom: 2px solid var(--steady-teal); padding-bottom: 4px; margin-bottom: 12px;">${escapeHtml(headerMatch[1])}</h2>`;
        const rest = lines.slice(1).join('\n').trim();
        if (rest) {
          html += processContent(rest);
        }
        continue;
      }
    }

    // Check if it's a numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      html += processNumberedList(trimmed);
      continue;
    }

    // Check if it's a bullet list
    if (/^[-•]\s/.test(trimmed)) {
      html += processBulletList(trimmed);
      continue;
    }

    // Regular paragraph
    html += processContent(trimmed);
  }

  return html.trim();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(text) {
  // Bold with teal color
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--steady-teal);">$1</strong>');
  // Escape quotes for template literal safety is handled at output
  return result;
}

function processContent(text) {
  const lines = text.split('\n');
  let html = '';
  let currentList = [];
  let listType = null; // 'bullet', 'numbered', 'step'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Numbered step pattern: "1. **Header**: content" or "1. content"
    const stepMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*[:\s]*(.*)$/);
    if (stepMatch) {
      if (currentList.length > 0 && listType !== 'step') {
        html += flushList(currentList, listType);
        currentList = [];
      }
      listType = 'step';
      const stepContent = stepMatch[3] ? `<strong style="color: var(--steady-teal);">${escapeHtml(stepMatch[2])}:</strong> ${inlineFormat(escapeHtml(stepContent2(stepMatch[3])))}` : `<strong style="color: var(--steady-teal);">${escapeHtml(stepMatch[2])}</strong>`;
      currentList.push({ num: stepMatch[1], label: escapeHtml(stepMatch[2]), content: stepMatch[3] ? escapeHtml(stepMatch[3]) : '' });
      continue;
    }

    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      if (currentList.length > 0 && listType !== 'numbered') {
        html += flushList(currentList, listType);
        currentList = [];
      }
      listType = 'numbered';
      currentList.push(numMatch[2]);
      continue;
    }

    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      if (currentList.length > 0 && listType !== 'bullet') {
        html += flushList(currentList, listType);
        currentList = [];
      }
      listType = 'bullet';
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Regular line - flush any pending list
    if (currentList.length > 0) {
      html += flushList(currentList, listType);
      currentList = [];
      listType = null;
    }

    // Check if it's a standalone bold header
    const boldHeader = line.match(/^\*\*(.+?)\*\*$/);
    if (boldHeader) {
      html += `\n<h2 style="color: var(--steady-warm-500); border-bottom: 2px solid var(--steady-teal); padding-bottom: 4px; margin-bottom: 12px;">${escapeHtml(boldHeader[1])}</h2>`;
      continue;
    }

    html += `\n<p style="margin-bottom: 12px; line-height: 1.6;">${inlineFormat(escapeHtml(line))}</p>`;
  }

  if (currentList.length > 0) {
    html += flushList(currentList, listType);
  }

  return html;
}

function stepContent2(s) { return s; }

function flushList(items, type) {
  if (type === 'step') {
    return '\n' + items.map(item => {
      const content = item.content ? ` ${inlineFormat(escapeHtml(item.content))}` : '';
      return `<div style="background: var(--steady-warm-50); padding: 12px; border-radius: 8px; margin: 6px 0;"><strong style="color: var(--steady-teal);">Step ${item.num} — ${item.label}:</strong>${content}</div>`;
    }).join('\n');
  }

  if (type === 'numbered') {
    return '\n<ol style="margin: 8px 0; padding-left: 20px;">' +
      items.map(item => `\n<li style="margin-bottom: 6px;">${inlineFormat(escapeHtml(item))}</li>`).join('') +
      '\n</ol>';
  }

  // bullet
  return '\n<ul style="margin: 8px 0; padding-left: 20px;">' +
    items.map(item => `\n<li style="margin-bottom: 6px;">${inlineFormat(escapeHtml(item))}</li>`).join('') +
    '\n</ul>';
}

function processNumberedList(text) {
  const lines = text.split('\n');
  let html = '';
  let items = [];
  let isStepList = false;

  for (const line of lines) {
    const stepMatch = line.trim().match(/^(\d+)\.\s+\*\*(.+?)\*\*[:\s]*(.*)$/);
    if (stepMatch) {
      isStepList = true;
      items.push({ num: stepMatch[1], label: stepMatch[2], content: stepMatch[3] || '' });
      continue;
    }
    const numMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      items.push(numMatch[2]);
      continue;
    }
    // Non-list line
    if (items.length > 0) {
      html += flushList(items, isStepList ? 'step' : 'numbered');
      items = [];
      isStepList = false;
    }
    if (line.trim()) {
      html += `\n<p style="margin-bottom: 12px; line-height: 1.6;">${inlineFormat(escapeHtml(line.trim()))}</p>`;
    }
  }

  if (items.length > 0) {
    html += flushList(items, isStepList ? 'step' : 'numbered');
  }

  return html;
}

function processBulletList(text) {
  const lines = text.split('\n');
  const items = [];
  let html = '';

  for (const line of lines) {
    const match = line.trim().match(/^[-•]\s+(.+)$/);
    if (match) {
      items.push(match[1]);
    } else if (line.trim()) {
      if (items.length > 0) {
        html += flushList(items, 'bullet');
        items.length = 0;
      }
      html += `\n<p style="margin-bottom: 12px; line-height: 1.6;">${inlineFormat(escapeHtml(line.trim()))}</p>`;
    }
  }

  if (items.length > 0) {
    html += flushList(items, 'bullet');
  }

  return html;
}

// Main conversion: find and replace TEXT parts in a file
function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Pattern: match TEXT part objects in parts arrays
  // We need to find patterns like:
  // {
  //   type: "TEXT",
  //   title: "...",
  //   content: {
  //     type: "TEXT",
  //     body: "...",
  //   },
  // },

  // Use a regex to find all TEXT part blocks
  // The key pattern is: type: "TEXT",\n        title: "...",\n        content: {\n          type: "TEXT",\n          body: "..."

  const regex = /(\{\s*type:\s*"TEXT",\s*title:\s*"([^"]+)",\s*content:\s*\{\s*type:\s*"TEXT",\s*body:\s*")((?:[^"\\]|\\.)*)("\s*,?\s*\}\s*,?\s*\})/g;

  let match;
  const replacements = [];

  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0];
    const title = match[2];
    const bodyRaw = match[3];

    // Unescape the body string
    const body = bodyRaw
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\t/g, '\t');

    const styledHtml = markdownToStyledHtml(title, body);

    // Build the replacement - use backtick template literal for styledHtml
    const replacement = `{
        type: "STYLED_CONTENT",
        title: "${title}",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: \`${styledHtml.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`,
        },
      }`;

    replacements.push({ start: match.index, end: match.index + fullMatch.length, replacement });
  }

  // Apply replacements in reverse order to preserve indices
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    content = content.substring(0, r.start) + r.replacement + content.substring(r.end);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Converted ${replacements.length} TEXT parts in ${filePath}`);

  // Print titles for verification
  for (const r of replacements) {
    // Extract title from the replacement
    const titleMatch = r.replacement.match(/title: "([^"]+)"/);
    if (titleMatch) console.log(`  - ${titleMatch[1]}`);
  }
}

// Process both files
convertFile('/mnt/c/Dev/steady/packages/db/prisma/templates/templates-7-8.ts');
convertFile('/mnt/c/Dev/steady/packages/db/prisma/templates/templates-9-10.ts');
