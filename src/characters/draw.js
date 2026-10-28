// draw.js: paints a character with the active style. The layout (bodies/*.js) says what the parts are; here each part
// becomes a paint() or inkLine() call, so the character takes the style's technique, multipliers and boil like the
// rest of the frame. Colours are the spec's roles, translated by the style:
//   STYLE.character = { toPaper, shadow, lineWeight } (all optional): toPaper mixes every colour towards PAL.paper,
//   shadow 'fill' paints shade parts as a watercolour glaze ('hard': a flat shape, for cel styles), lineWeight scales
//   the outline. A spec can also give a role's colour for one style: spec.styles[<style>][<role>].
//
//   character('gatto', x, y, u, { view, flip, pose, expression, t, since, kick, key, noShadow, outfit })
// (x, y) is the ground point under the character, u its size unit (the cat is about 10u long, the monster 6u tall).
// expression: a name, a set of params, or act(t, keys, CHARACTERS.<id>). key: a stable id for its boil seeds (default:
// the character's id; set it when two of the same character are on screen).
const CHAR_STYLE = { toPaper: 0, shadow: 'fill', lineWeight: 1, ...(STYLE.character || {}) };

// A bad spec stops the page at once, like a wrong style or format (render.mjs prints window.loadError).
for (const [id, spec] of Object.entries(CHARACTERS)) {
  const errs = validateCharacter(spec);
  if (errs.length) { window.loadError = `Personaggio "${id}": ${errs.join('; ')}`; throw new Error(window.loadError); }
}

function roleColor(spec, role) {
  const own = spec.styles && spec.styles[STYLE_NAME] && spec.styles[STYLE_NAME][role];
  return own || mixCol(spec.roles[role], PAL.paper, CHAR_STYLE.toPaper);
}

function character(id, x, y, u, o = {}) {
  if (!CHARACTERS[id]) throw new Error(`Personaggio "${id}" inesistente. Disponibili: ${Object.keys(CHARACTERS).join(', ')}`);
  const spec = outfitSpec(CHARACTERS[id], o.outfit);           // outfit: one of spec.outfits (vale's 'ufficio')
  const L = BODIES[spec.body].layout(spec, resolveState(spec, o));
  const key = o.key ?? id, sw0 = clamp(u / 15, .45, 2.4) * .6 * CHAR_STYLE.lineWeight;   // thinner than Clawd's: many small parts
  const line = roleColor(spec, 'line'), shade = roleColor(spec, 'shadow');
  const px = pts => pts.map(([a, b]) => [x + a * u, y + b * u]);
  for (const p of L.parts) {
    if (o.noShadow && p.id === 'shadow') continue;
    boilSeed(`char ${key} ${p.id}`);               // each part boils from its own seed: a moving tail never re-boils the head
    let col = roleColor(spec, p.role);
    if (p.dim) col = mixCol(col, shade, p.dim);       // far legs and ears, a step darker
    const pts = px(p.pts), sw = sw0 * (p.line || 0);
    if (p.stroke) inkLine(pts, Math.max(sw, .3), col, 'ink', .5);
    else if (p.shade) paint(pts, CHAR_STYLE.shadow === 'hard' ? { wash: col, washOp: 255, ink: null }
      : { fill: col, fillOp: p.id === 'shadow' ? 90 : 110, bleed: .1, tex: .4, ink: null });
    else paint(pts, { wash: col, washOp: 255, ink: p.line ? line : null, sw });
  }
  boilSeed(`char ${key} after`);                      // whatever is drawn next doesn't depend on this pose
}
