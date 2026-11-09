// Postage-stamp artwork shared by the certificate card and its OG image. Pure, no I/O.
// SVGs carry no text: the OG renderer rasterizes <img> SVGs without fonts.

/** The certificate paper, shared by the page and the OG image. */
export const PAPER = "#FFFDF8";

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * A stamp sheet with perforated edges: a filled rect with round bites along every side.
 * Used by the OG image; the page does the same with a CSS mask so it can stretch.
 */
export function perforatedStampSvg(width: number, height: number, fill: string, radius = 9, gap = 26): string {
  const along = (length: number) => {
    const count = Math.floor(length / gap);
    const start = (length - (count - 1) * gap) / 2;
    return Array.from({ length: count }, (_, i) => start + i * gap);
  };
  const bites = [
    ...along(width).flatMap((x) => [`<circle cx="${x}" cy="0" r="${radius}"/>`, `<circle cx="${x}" cy="${height}" r="${radius}"/>`]),
    ...along(height).flatMap((y) => [`<circle cx="0" cy="${y}" r="${radius}"/>`, `<circle cx="${width}" cy="${y}" r="${radius}"/>`]),
  ].join("");
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><mask id="m"><rect width="${width}" height="${height}" fill="#fff"/><g fill="#000">${bites}</g></mask></defs>` +
      `<rect width="${width}" height="${height}" fill="${fill}" mask="url(#m)"/></svg>`,
  );
}

/** "10 NOV 2026", the postmark's date line. */
export function postmarkDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${day} ${months[month - 1]} ${year}`;
}

/** Postmark line: whole words that fit in `max` characters, cut mid-word only if the first word is too long. */
export function ringText(value: string, max: number): string {
  const words = value.trim().toUpperCase().split(/\s+/);
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > max) break;
    out = next;
  }
  return out || words[0].slice(0, max);
}

/** The wavy "cancellation" lines that run beside a postmark. */
export function cancellationWavesSvg(width: number, height: number, color: string, lines = 5): string {
  const gap = height / lines;
  const wave = 22;
  const paths = Array.from({ length: lines }, (_, i) => {
    const y = gap / 2 + i * gap;
    let d = `M0 ${y.toFixed(1)}`;
    for (let x = 0; x < width; x += wave) d += ` q ${wave / 4} -${gap / 4} ${wave / 2} 0 t ${wave / 2} 0`;
    return `<path d="${d}"/>`;
  }).join("");
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<g fill="none" stroke="${color}" stroke-width="${Math.max(2, gap / 5).toFixed(1)}" stroke-linecap="round">${paths}</g></svg>`,
  );
}
