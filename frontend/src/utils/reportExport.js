export function reportToText(report) {
  if (!report) {
    return "";
  }
  const lines = [
    `Period: ${report.period || "Current period"}`,
    "",
    report.summary || "",
    "",
    section("Highlights", report.highlights),
    section("Risks", report.risks),
    section("Recommended actions", report.recommended_actions),
  ];
  return lines.filter(Boolean).join("\n");
}

export function downloadText(filename, content) {
  downloadBlob(filename, new Blob([content], { type: "text/plain;charset=utf-8" }));
}

export function downloadPdf(filename, content) {
  const pdf = buildSimplePdf(content);
  downloadBlob(filename, new Blob([pdf], { type: "application/pdf" }));
}

function section(title, items = []) {
  if (!items.length) {
    return "";
  }
  return [`${title}:`, ...items.map((item) => `- ${item}`)].join("\n");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildSimplePdf(content) {
  const lines = wrapLines(content, 82).slice(0, 42);
  const textCommands = lines
    .map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 16} Td (${escapePdf(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${textCommands.length} >>\nstream\n${textCommands}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return body;
}

function wrapLines(content, maxLength) {
  return content.split("\n").flatMap((line) => {
    const words = line.split(" ");
    const lines = [""];
    words.forEach((word) => {
      const current = lines[lines.length - 1];
      if (`${current} ${word}`.trim().length > maxLength) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = `${current} ${word}`.trim();
      }
    });
    return lines;
  });
}

function escapePdf(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
