// registry.js: the character library's registries. Each character file registers a SPEC (data only: strings, numbers,
// arrays, objects) in CHARACTERS; each body type registers itself in BODIES:
//   BODIES.<type> = { roles, proportions, partRoles, parts, poseParams, exprParams, views, layout(spec, state) }
// roles: colour roles every character of this body must give; proportions: the measures its layout reads (numbers);
// partRoles: optional parts drawn only when the spec declares them, with the colour role each then needs; parts: the
// part names a spec may configure and a feature may point at; poseParams / exprParams: the parameters a pose or an
// expression may set (numbers, or names like an eye shape); a pose may also carry its own face, expression: { params },
// used when the scene gives none; views: the drawn key views.
// Pure: no p5, no DOM, no style. Loaded by studio.html and, the same file, by the tests (tools/pagecode.mjs).
const CHARACTERS = {};
const BODIES = {};

// The problems with a spec, in Italian, one string each; [] when it is valid.
function validateCharacter(spec) {
  const errs = [], id = spec && spec.id ? `"${spec.id}"` : '';
  const hasFn = v => typeof v === 'function' || (v && typeof v === 'object' && Object.values(v).some(hasFn));
  if (!spec || typeof spec !== 'object') return ['la scheda non è un oggetto'];
  if (hasFn(spec)) errs.push(`la scheda ${id} deve contenere solo dati (niente funzioni)`);
  for (const k of ['id', 'version', 'body', 'proportions', 'parts', 'roles', 'features', 'expressions', 'poses'])
    if (spec[k] == null) errs.push(`manca il campo "${k}"`);
  const body = BODIES[spec.body];
  if (spec.body != null && !body) errs.push(`corpo "${spec.body}" sconosciuto. Disponibili: ${Object.keys(BODIES).join(', ')}`);
  if (!body) return errs;
  const roles = spec.roles || {};
  for (const r of body.roles) if (!(r in roles)) errs.push(`manca il ruolo colore "${r}"`);
  for (const [part, r] of Object.entries(body.partRoles || {}))
    if (spec.parts && part in spec.parts && !(r in roles)) errs.push(`la parte "${part}" vuole il ruolo colore "${r}"`);
  // roles some options of a part want (an adult eye's iris, a lip...)
  if (body.optionRoles) for (const [part, r] of body.optionRoles(spec.parts || {}))
    if (!(r in roles)) errs.push(`la parte "${part}" vuole il ruolo colore "${r}"`);
  for (const k of body.proportions || []) {
    const v = (spec.proportions || {})[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) errs.push(`proporzione "${k}" mancante o non numerica`);
  }
  for (const [r, hex] of Object.entries(roles)) if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) errs.push(`ruolo "${r}": colore "${hex}" non valido (serve #RRGGBB)`);
  for (const p of Object.keys(spec.parts || {})) if (!body.parts.includes(p)) errs.push(`parte "${p}" sconosciuta per il corpo ${spec.body}`);
  for (const f of spec.features || []) {
    if (!body.parts.includes(f.part)) errs.push(`tratto "${f.id}": parte "${f.part}" sconosciuta`);
    for (const v of f.views || []) if (!body.views.includes(v)) errs.push(`tratto "${f.id}": vista "${v}" sconosciuta`);
  }
  const params = (what, table, allowed) => {
    for (const [name, set] of Object.entries(table || {}))
      for (const [k, v] of Object.entries(set)) {
        if (what === 'posa' && k === 'expression' && v && typeof v === 'object') { params(`posa "${name}", espressione`, { '': v }, body.exprParams); continue; }
        if (!allowed.includes(k)) errs.push(`${what} "${name}": parametro "${k}" sconosciuto`);
        else if (!(typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)))) errs.push(`${what} "${name}": parametro "${k}" non valido`);
        // eye and mouth names are checked here, not halfway through a render
        else if (k === 'eyes' && !FACES.EYES.includes(v)) errs.push(`${what} "${name}": occhi "${v}" inesistenti. Disponibili: ${FACES.EYES.join(', ')}`);
        else if (k === 'mouth' && !FACES.MOUTHS.includes(v)) errs.push(`${what} "${name}": bocca "${v}" inesistente. Disponibili: ${FACES.MOUTHS.join(', ')}`);
        else if (k === 'gesture' && !(spec.gestures || {})[v]) errs.push(`${what} "${name}": gesto "${v}" inesistente. Disponibili: ${Object.keys(spec.gestures || {}).join(', ')}`);
        else if (k === 'brows' && typeof v === 'string' && !(v in FACES.BROWS)) errs.push(`${what} "${name}": sopracciglia "${v}" inesistenti. Disponibili: ${Object.keys(FACES.BROWS).join(', ')}`);
      }
  };
  // every outfit is checked as a whole character (outfitSpec, act.js)
  for (const name of Object.keys(spec.outfits || {}))
    for (const e of validateCharacter(outfitSpec(spec, name))) errs.push(`abito "${name}": ${e}`);
  params('posa', spec.poses, body.poseParams);
  params('espressione', spec.expressions, body.exprParams);
  // gestures: what the hands do while the face changes (pose params, named by an expression's gesture)
  params('gesto', spec.gestures, body.poseParams);
  // poseViews: the view a pose is drawn in on the pose sheet
  for (const [p, v] of Object.entries(spec.poseViews || {})) {
    if (!(spec.poses || {})[p]) errs.push(`poseViews: posa "${p}" inesistente`);
    if (!body.views.includes(v)) errs.push(`poseViews: vista "${v}" sconosciuta`);
  }
  return errs;
}
