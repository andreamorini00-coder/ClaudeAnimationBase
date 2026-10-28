// act.js: a character's acting, as pure functions of time. act() plays expression changes the way a drawn character
// makes them (a squint while the face swaps, then a small take of the body); blendPose() mixes two poses;
// resolveState() turns a scene's options into the state a body's layout() draws.

// keys: [[t0, 'felice'], [t1, 'sorpreso'], ...] (expression names of the spec). Each change lasts D = 0.3 s:
// numbers ease from the old value to the new one, names (eye and mouth shapes) swap halfway, where the eyes are
// squinted shut (squint = 1); take is a damped bounce kicked halfway through, for the body.
function act(t, keys, spec) {
  const D = .3, body = BODIES[spec.body], full = name => {
    if (!spec.expressions[name]) throw new Error(`Espressione "${name}" inesistente per ${spec.id}. Disponibili: ${Object.keys(spec.expressions).join(', ')}`);
    return { ...body.EXPR0, ...spec.expressions[name] };
  };
  const K = keys.map(([t0, name]) => [t0, full(name)]).sort((a, b) => a[0] - b[0]);
  let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
  const [t0, cur] = K[i];
  if (i === 0 || t >= t0 + D) return { expression: { ...cur, squint: 0 }, take: i === 0 ? 0 : CG.spring(t, t0 + D / 2, 6, 14) };
  const from = K[i - 1][1], k = (t - t0) / D;
  return { expression: { ...blendPose(from, cur, CG.smooth(k)), squint: Math.sin(Math.PI * k) }, take: CG.spring(t, t0 + D / 2, 6, 14) };
}

// The eyes' name at t for a blink every 3 to 4.8 s (the interval from seed: the same every render): open -> sleepy ->
// closed -> sleepy -> open, 0.2 s in all.
function blink(t, seed = 0) {
  const h = k => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  let start = 0, k = 0;
  while (true) { const next = start + 3 + 1.8 * h(k); if (next > t) break; start = next; k++; }
  const d = t - start;
  return k === 0 || d >= .2 ? 'open' : d < .05 || d >= .15 ? 'sleepy' : 'closed';
}

// A mouth that talks without audio: a fixed run of mouth names, `rate` a second.
function talk(t, rate = 8) {
  const seq = ['flat', 'ajar', 'open', 'ajar', 'o', 'flat', 'open', 'ajar'];
  return seq[((Math.floor(t * rate) % 8) + 8) % 8];
}

// Numbers interpolated, names (and anything else) taken from b from halfway on.
function blendPose(a, b, k) {
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? b[key], y = b[key] ?? a[key];
    out[key] = typeof x === 'number' && typeof y === 'number' ? CG.lerp(x, y, k) : (k >= .5 ? y : x);
  }
  return out;
}

// A character in one of its outfits (spec.outfits[name] = { parts, roles, features }): parts and roles replaced key by
// key, features by id ({ id, remove: true } takes one away); its id becomes "<id>.<outfit>". No name: the spec itself.
function outfitSpec(spec, name) {
  if (!name) return spec;
  const o = (spec.outfits || {})[name];
  if (!o) throw new Error(`Abito "${name}" inesistente per ${spec.id}. Disponibili: ${Object.keys(spec.outfits || {}).join(', ')}`);
  const mine = o.features || [], features = (spec.features || []).filter(f => !mine.some(g => g.id === f.id)).concat(mine.filter(g => !g.remove));
  const out = { ...spec, id: `${spec.id}.${name}`, parts: { ...spec.parts, ...(o.parts || {}) }, roles: { ...spec.roles, ...(o.roles || {}) }, features };
  delete out.outfits;
  return out;
}

// o: { view = 'q', flip, pose = <the spec's first pose> | {params}, expression = neutral | 'name' | {params} | act(...),
//      t = 0, since, kick } → { view, flip, pose, expression, t, since, kick }, every name checked against the spec.
function resolveState(spec, o = {}) {
  const body = BODIES[spec.body], view = o.view ?? 'q';
  if (!body.views.includes(view)) throw new Error(`Vista "${view}" inesistente. Disponibili: ${body.views.join(', ')}`);
  const named = (what, table, name) => {
    if (!table[name]) throw new Error(`${what} "${name}" inesistente per ${spec.id}. Disponibili: ${Object.keys(table).join(', ')}`);
    return table[name];
  };
  const poseIn = o.pose ?? Object.keys(spec.poses)[0];
  const { expression: poseFace, ...poseParams } = typeof poseIn === 'string' ? named('Posa', spec.poses, poseIn) : poseIn;
  const pose = { ...body.POSE0, ...poseParams };
  let expression = { ...body.EXPR0 }, take = 0;
  const e = o.expression ?? poseFace;                      // a pose's own face, unless the scene gives one
  if (typeof e === 'string') expression = { ...expression, ...named('Espressione', spec.expressions, e) };
  else if (e && e.expression) { expression = { ...expression, ...e.expression }; take = e.take || 0; }
  else if (e) expression = { ...expression, ...e };
  // a gesture of the face (what the hands do) goes over the pose
  if (expression.gesture) {
    const g = (spec.gestures || {})[expression.gesture];
    if (!g) throw new Error(`Gesto "${expression.gesture}" inesistente per ${spec.id}. Disponibili: ${Object.keys(spec.gestures || {}).join(', ')}`);
    Object.assign(pose, g);
  }
  // the take after a change of face: a blob squashes a little (keeping its volume), a legged body hops a little
  if (take) { if ('squash' in pose) pose.squash *= 1 - .12 * take; else if ('lift' in pose) pose.lift += .25 * Math.max(0, take); }
  return { view, flip: !!o.flip, pose, expression, t: o.t ?? 0, since: o.since, kick: o.kick, bust: o.bust === 'face' ? 'face' : !!o.bust };
}
