/**
 * Marker palette for circled words on word search answer keys and the
 * play grid. Saturated, darker hues that read on white print paper and
 * the cream play-grid cells alike. Indexed per word, cycled.
 *
 * Shared by the SVG overlay (WordCircleOverlay) and the PDF renderer
 * (pdfExport) so a printed key matches the browser preview.
 */

export const WORD_CIRCLE_COLORS = [
  '#c2410c', // burnt orange
  '#1d4ed8', // blue
  '#15803d', // green
  '#b91c1c', // red
  '#7e22ce', // purple
  '#0e7490', // teal
  '#a16207', // mustard
  '#be185d', // magenta
  '#4d7c0f', // olive
  '#6d28d9', // violet
];

/** '#rrggbb' → [r, g, b] for jsPDF's setDrawColor. */
export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
