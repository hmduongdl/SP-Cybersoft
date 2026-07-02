function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHref(value: string): boolean {
  return /^(https?:|mailto:|tel:|\/|#)/i.test(value.trim());
}

function parseInlineMarkdown(text: string): string {
  let html = escapeHtml(text);

  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br />");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_match, label: string, href: string) => {
      const safeHref = isSafeHref(href) ? href : "#";
      return `<a href="${escapeHtml(safeHref)}">${label}</a>`;
    }
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return html;
}

function normalizePlainTextForClipboard(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n");
}

function headingStyle(level: number): string {
  if (level === 1) return "font-size: 22px; font-weight: bold; margin-top: 20px; margin-bottom: 12px;";
  if (level === 2) return "font-size: 18px; font-weight: bold; margin-top: 16px; margin-bottom: 10px;";
  if (level === 3) return "font-size: 16px; font-weight: bold; margin-top: 12px; margin-bottom: 8px;";
  return "font-weight: bold; margin-top: 10px; margin-bottom: 6px;";
}

function isTableSeparator(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function renderTable(lines: string[]): string {
  const [headerLine, _separatorLine, ...bodyLines] = lines;
  const headers = splitTableRow(headerLine);
  const rows = bodyLines.map(splitTableRow);

  return [
    "<table style='border-collapse: collapse; margin-bottom: 10px;'>",
    "<thead><tr>",
    headers
      .map((cell) => `<th style='border: 1px solid #ddd; padding: 6px;'>${parseInlineMarkdown(cell)}</th>`)
      .join(""),
    "</tr></thead>",
    rows.length
      ? `<tbody>${rows
          .map((row) =>
            `<tr>${row
              .map((cell) => `<td style='border: 1px solid #ddd; padding: 6px;'>${parseInlineMarkdown(cell)}</td>`)
              .join("")}</tr>`
          )
          .join("")}</tbody>`
      : "",
    "</table>",
  ].join("");
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const htmlLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let index = 0;

  const closeOpenList = () => {
    if (inUnorderedList) {
      htmlLines.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      htmlLines.push("</ol>");
      inOrderedList = false;
    }
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (index + 1 < lines.length && trimmed.includes("|") && isTableSeparator(lines[index + 1])) {
      closeOpenList();
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      htmlLines.push(renderTable(tableLines));
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (inOrderedList) {
        htmlLines.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        htmlLines.push("<ul style='margin-bottom: 10px; padding-left: 20px;'>");
        inUnorderedList = true;
      }
      htmlLines.push(`  <li style='margin-bottom: 4px;'>${parseInlineMarkdown(unorderedMatch[1])}</li>`);
      index += 1;
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (inUnorderedList) {
        htmlLines.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        htmlLines.push("<ol style='margin-bottom: 10px; padding-left: 20px;'>");
        inOrderedList = true;
      }
      htmlLines.push(`  <li style='margin-bottom: 4px;'>${parseInlineMarkdown(orderedMatch[1])}</li>`);
      index += 1;
      continue;
    }

    closeOpenList();

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      htmlLines.push(
        `<h${level} style='${headingStyle(level)}'>${parseInlineMarkdown(heading[2])}</h${level}>`
      );
    } else if (trimmed === "") {
      htmlLines.push("<br />");
    } else if (trimmed.startsWith("> ")) {
      htmlLines.push(
        `<blockquote style='margin: 0 0 10px 0; padding-left: 12px; border-left: 3px solid #ddd;'>${parseInlineMarkdown(
          trimmed.substring(2)
        )}</blockquote>`
      );
    } else {
      htmlLines.push(`<div style='margin-bottom: 6px; line-height: 1.5;'>${parseInlineMarkdown(line)}</div>`);
    }

    index += 1;
  }

  closeOpenList();

  return htmlLines.join("\n");
}

function copyWithExecCommand(markdownText: string, htmlContent: string): boolean {
  const plainText = normalizePlainTextForClipboard(markdownText);

  const handleCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/html", htmlContent);
    event.clipboardData?.setData("text/plain", plainText);
    event.preventDefault();
  };

  document.addEventListener("copy", handleCopy);
  const successful = document.execCommand("copy");
  document.removeEventListener("copy", handleCopy);

  return successful;
}

export async function copyMarkdownAsRichText(markdownText: string): Promise<boolean> {
  try {
    const htmlContent = markdownToHtml(markdownText);
    const plainText = normalizePlainTextForClipboard(markdownText);

    if (copyWithExecCommand(markdownText, htmlContent)) {
      return true;
    }

    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([htmlContent], { type: "text/html" }),
        }),
      ]);
      return true;
    }
  } catch (error) {
    console.error("Loi sao chep nang cao:", error);
  }

  try {
    await navigator.clipboard.writeText(normalizePlainTextForClipboard(markdownText));
    return true;
  } catch {
    return false;
  }
}
