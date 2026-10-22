// registry.js: every style file registers itself in STYLES (see classic.js), every technique in TECHNIQUES (see
// src/techniques/watercolor.js). Loaded before the styles, the techniques and core.js.
const STYLES = {};
// A technique is how a style puts marks down: { paintAt(pts, o), inkLine(P, sw, col, br, curv), makePaper(style),
// makeGrain(style) }. core.js's paint() and inkLine() call the one STYLE.technique names.
const TECHNIQUES = {};
