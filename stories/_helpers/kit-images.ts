/**
 * Offline stand-ins for the P1 placeholder photos (the kit's defaults point at
 * components.p1.pantheon.io, which stories must not hit). Each is a plain dark
 * neutral gradient as an inline SVG data URL, so stories stay deterministic.
 */
function gradient(from: string, to: string, angle: [number, number, number, number] = [0, 0, 1, 1]): string {
  const [x1, y1, x2, y2] = angle;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="none">` +
    `<defs><linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="1600" height="1000" fill="url(#g)"/></svg>`;
  // encodeURIComponent leaves ( ) ' alone; the Hero knockout title puts this in an unquoted
  // css url(...), where a bare ")" would end the url early.
  const encoded = encodeURIComponent(svg).replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/'/g, "%27");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export const IMG = {
  hero: gradient("#4a423d", "#211e1d"),
  wide: gradient("#3d3835", "#1e1b1a", [0, 1, 1, 0]),
  card1: gradient("#463f3a", "#26221f"),
  card2: gradient("#3b3836", "#201d1c", [1, 0, 0, 1]),
  card3: gradient("#443c36", "#1f1c1b", [0, 0, 0, 1]),
  card4: gradient("#3a3532", "#252120", [1, 0, 0, 0]),
};
