// lighting.js: the sets of colours for the lights of a style (day, night, backlight), as pure functions. No p5, no DOM,
// no PAL: loaded by studio.html before core.js and, the same file, by the tests (tools/pagecode.mjs STYLE_SCRIPTS).
// A style that has lights lists them in STYLE.luci = { giorno, notte, controluce }, each:
//   { palette: { <PAL name>: hex, … } (only what changes), ink?, tone, k, skin, skinShadow, shadow, rim?, light? }
//   tone / k: the colour the characters' roles are mixed towards, and how much; skin and skinShadow are the skin's own
//   colours in that light (so under a coloured light it never turns pink); shadow: the tone of the shadows; rim:
//   { colore, spessore } a warm light along the edge facing the light (backlight); light: [dx, dy] towards the light.
// luce() in core.js applies a set to the page; character() (draw.js) asks LIGHT.role for each role's colour.
const LIGHT = {
  // the same mix as mixCol in core.js (RGB, k clamped to 0..1)
  mixHex(a, b, k) {
    k = Math.max(0, Math.min(1, k));
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(((pa >> i) & 255) + (((pb >> i) & 255) - ((pa >> i) & 255)) * k);
    return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1).toUpperCase();
  },
  lum(hex) {
    const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const n = parseInt(hex.slice(1), 16);
    return .2126 * f((n >> 16) & 255) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255);
  },
  // WCAG contrast ratio, 1 (equal) .. 21
  contrast(a, b) { const la = LIGHT.lum(a), lb = LIGHT.lum(b); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05); },
  // hue in degrees, 0..360
  hue(hex) {
    const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  },
  // The complete set called nome for a style, or null if the style has no lights. giorno is the style's own palette.
  set(style, nome) {
    if (!style.luci) return null;
    const s = style.luci[nome];
    if (!s) throw new Error(`Luce "${nome}" inesistente. Disponibili: ${Object.keys(style.luci).join(', ')}`);
    const palette = { ...style.palette, ...(s.palette || {}) }, ink = s.ink || palette.ink;
    palette.ink = ink;
    // skinK: how far a character's own skin goes to the light's skin (0 in the day light, where it keeps its own)
    return { nome, palette, ink, tone: s.tone, k: s.k, skinK: s.skinK ?? (s.k > 0 ? 1 : 0), skin: s.skin, skinShadow: s.skinShadow, shadow: s.shadow,
      rim: s.rim ? { ...s.rim } : null, light: (s.light || (style.cel && style.cel.light) || [-1, -1]).slice() };
  },
  // A set between two others: colours mixed, k, the light's direction and the rim's thickness interpolated (a rim
  // that only one of them has fades in or out).
  mix(style, da, a, k) {
    const A = LIGHT.set(style, da), B = LIGHT.set(style, a);
    if (!A || !B) return A || B;
    const m = (x, y) => LIGHT.mixHex(x, y, k), lerp = (x, y) => x + (y - x) * Math.max(0, Math.min(1, k));
    const palette = {}; for (const key of Object.keys(A.palette)) palette[key] = m(A.palette[key], B.palette[key]);
    let rim = null;
    if (A.rim && B.rim) rim = { colore: m(A.rim.colore, B.rim.colore), spessore: lerp(A.rim.spessore, B.rim.spessore) };
    else if (A.rim) rim = { ...A.rim, spessore: A.rim.spessore * (1 - Math.max(0, Math.min(1, k))) };
    else if (B.rim) rim = { ...B.rim, spessore: B.rim.spessore * Math.max(0, Math.min(1, k)) };
    if (rim && rim.spessore <= 0) rim = null;
    return { nome: k <= 0 ? da : k >= 1 ? a : `${da}>${a}`, palette, ink: palette.ink, tone: m(A.tone, B.tone), k: lerp(A.k, B.k), skinK: lerp(A.skinK, B.skinK),
      skin: m(A.skin, B.skin), skinShadow: m(A.skinShadow, B.skinShadow), shadow: m(A.shadow, B.shadow), rim,
      light: [lerp(A.light[0], B.light[0]), lerp(A.light[1], B.light[1])] };
  },
  // The colour of one of a character's roles in a light, for the character's spec (draw.js): its own colour in no light or
  // in the day, the spec's own colour for that light if it gives one (spec.styles.<style>.luci.<light>.<role>), the light's
  // skin for the skin roles (and any role that is the skin's colour, like the girl's legs), else LIGHT.role.
  charRole(spec, role, base, set, styleName) {
    if (!set) return base;
    const own = spec.styles && spec.styles[styleName] && spec.styles[styleName].luci && spec.styles[styleName].luci[set.nome];
    if (own && own[role]) return own[role];
    if (LIGHT.isSkin(spec, role)) return set.skinK ? LIGHT.mixHex(base, set.skin, set.skinK) : base;
    if (role === 'skinShadow') return set.skinK ? LIGHT.mixHex(base, set.skinShadow, set.skinK) : base;
    return LIGHT.role(base, role, set);
  },
  // Is this role a skin: the skin itself, or any role that has the skin's colour (the girl's legs).
  isSkin(spec, role) { const roles = spec.roles || {}; return role === 'skin' || (role !== 'skinShadow' && role !== 'line' && !!roles.skin && roles[role] === roles.skin); },
  // The role holding the shadow colour of a role in this spec (a skin has skinShadow when the spec gives one), or null.
  shadeRole(spec, role) {
    const roles = spec.roles || {};
    if (LIGHT.isSkin(spec, role) && 'skinShadow' in roles) return 'skinShadow';
    return (role + 'Shadow') in roles ? role + 'Shadow' : null;
  },
  // Write a light onto the page's palette `pal` (the style's palette is never changed: `style.palette` is the base).
  // luce(nome) or luce(da, a, k). Returns the set, or null when the style has no lights (then nothing changes).
  apply(pal, style, a, b, k) {
    const set = b == null ? LIGHT.set(style, a) : LIGHT.mix(style, a, b, k);
    if (set) Object.assign(pal, set.palette);
    return set;
  },
  // Back to the style's own palette (the start of every frame).
  reset(pal, style) { Object.assign(pal, style.palette); },
  // The colour of one of a character's roles in a light: the outline and the whites never change, the skin is the
  // set's, everything else is mixed towards the set's tone.
  role(col, role, set) {
    if (role === 'line' || role === 'eyeWhite') return col;
    if (role === 'skin') return set.skin;
    if (role === 'skinShadow') return set.skinShadow;
    return set.k ? LIGHT.mixHex(col, set.tone, set.k) : col;
  },
};
