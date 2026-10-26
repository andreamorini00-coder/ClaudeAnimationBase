// quadruped.js: a four-legged body (the cat; the little dragon later, with wings). Pure: layout() returns the parts of
// one drawing, in units (u = 1), origin on the ground under the body, y down, facing screen-right; flip mirrors it.
//
// Proportions (spec.proportions): length (nose to rump), head (head width), bodyHeight, legLength, legWidth, tail.
// Pose params: crouch 0..1 (body lowered, legs bent), pitch (radians, + = nose up), lift (units off the ground),
//   stretch (body length factor), legSwing (how far legs swing), legPhase, pawRaise 0..1 (near front paw up),
//   cycle (1 = the legs run with t, a gallop of about 2 strides a second).
// Expression params: eyes, mouth (FACES kinds), ears -1 (down) .. 0 .. 1 (flat back), tail -1 (drooping) .. 0 (hook)
//   .. 1 (straight up), tailCurl 0..1 (wrapped round the body), headTilt (radians). act() adds squint and look.
BODIES.quadruped = {
  roles: ['fur', 'cream', 'earInner', 'line', 'shadow', 'eyeWhite'],
  parts: ['body', 'head', 'muzzle', 'blaze', 'ears', 'legs', 'tail', 'tailTip', 'collar', 'bell', 'whiskers', 'eyes', 'mouth', 'shadow'],
  poseParams: ['crouch', 'pitch', 'lift', 'stretch', 'legSwing', 'legPhase', 'pawRaise', 'cycle'],
  exprParams: ['eyes', 'mouth', 'ears', 'tail', 'tailCurl', 'headTilt'],
  views: ['front', 'q', 'side', 'back'],
  POSE0: { crouch: 0, pitch: 0, lift: 0, stretch: 1, legSwing: 0, legPhase: 0, pawRaise: 0, cycle: 0 },
  EXPR0: { eyes: 'open', mouth: 'catSmile', ears: 0, tail: 0, tailCurl: 0, headTilt: 0, squint: 0, look: 0 },
  // Per view: body shape and width factor, where the head sits (x as a share of the length), the legs
  // ([x as a share of the body length, far?, front?]), where the tail starts and how it points, which face shows.
  VIEW: {
    side:  { body: 'bean', lenK: 1, headX: .5, legs: [[-.34, 1, 0], [.3, 1, 1], [-.4, 0, 0], [.24, 0, 1]], tail: { x: -.5, y: -.6, a: -.62, flipBend: 1, behind: 1 }, face: 'side' },
    q:     { body: 'bean', lenK: .7, headX: .55, legs: [[-.3, 1, 0], [.34, 1, 1], [-.38, 0, 0], [.22, 0, 1]], tail: { x: -.5, y: -.7, a: -.6, flipBend: 1, behind: 1 }, face: 'q' },
    front: { body: 'round', lenK: .6, headX: 0, legs: [[-.36, 1, 0], [.36, 1, 0], [-.18, 0, 1], [.18, 0, 1]], tail: { x: .42, y: -.55, a: -.4, flipBend: -1, behind: 1 }, face: 'front' },
    back:  { body: 'round', lenK: .6, headX: 0, legs: [[-.36, 1, 1], [.36, 1, 1], [-.18, 0, 0], [.18, 0, 0]], tail: { x: .05, y: -.45, a: -.5, flipBend: 1, behind: 0 }, face: null },
  },

  layout(spec, state) {
    const B = BODIES.quadruped, V = B.VIEW[state.view];
    if (!V) throw new Error(`Vista "${state.view}" inesistente. Disponibili: ${B.views.join(', ')}`);
    const P = { ...B.POSE0, ...(state.pose || {}) }, E = { ...B.EXPR0, ...(state.expression || {}) }, t = state.t || 0;
    const pr = spec.proportions, sp = spec.parts || {}, parts = [];
    const add = (id, role, depth, pts, more = {}) => parts.push({ id, role, depth, pts, line: 1, ...more });

    // ---- body ----
    const headW = pr.head, headH = pr.head * .9, legL = pr.legLength * (1 - .55 * P.crouch), bodyH = pr.bodyHeight;
    const bodyLen = (pr.length - headW * .55) * V.lenK * P.stretch, cx = V.body === 'bean' ? -headW * .3 * V.lenK : 0;
    const cy = -(legL + bodyH / 2 - .45), lift = -P.lift;
    const bodyPts = V.body === 'bean' ? CG.bean(cx, cy, bodyLen, bodyH, .32) : CG.ellipse(0, cy, bodyH * .72, bodyH / 2, 40);
    const halfW = V.body === 'bean' ? bodyLen / 2 : bodyH * .72;
    const pivot = [cx, cy], pitch = -P.pitch;
    const pose = pts => CG.translate(CG.rotate(pts, pitch, pivot[0], pivot[1]), 0, lift);   // body frame → world

    add('shadow', 'shadow', -10, CG.ellipse(0, .15, (halfW + .6) * (1 - Math.min(.5, P.lift * .12)), .45, 28), { line: 0, shade: 1 });
    add('body', 'fur', 0, pose(bodyPts));
    add('bodyShade', 'shadow', .1, pose(CG.clipY(bodyPts, cy + bodyH * .3, 1)), { line: 0, shade: 1 });
    if (V.face) {                                                  // the cream chest: the lower end of the blaze
      const chest = V.body === 'bean' ? CG.clipY(CG.clipX(bodyPts, cx + bodyLen * .28, 1), cy - bodyH * .15, 1)
        : CG.drop(V.face === 'front' ? 0 : .3, cy + bodyH * .42, bodyH * .5, bodyH * .78);
      add('chest', 'cream', .2, pose(chest), { line: 0, feature: 'blaze' });
    }

    // ---- legs: hips on the body's underside, feet on the ground (or dangling when lifted) ----
    const hipY = cy + bodyH * .32, legV = -hipY;                   // a straight leg from the hip just reaches the ground
    V.legs.forEach(([lx, far, front], i) => {
      const hip = pose([[cx + lx * (V.body === 'bean' ? bodyLen : halfW * 2), hipY]])[0];
      let a, footUp = 0;
      if (P.cycle) {                                                // a gallop: diagonal pairs together, feet lift as they swing forward
        const ph = (t * 2 + P.legPhase + [0, .5, .5, 0][i]) * Math.PI * 2;
        a = P.legSwing * .6 * Math.sin(ph); footUp = Math.max(0, Math.cos(ph)) * .5 * P.legSwing;
      } else a = (front ? 1 : -1) * P.legSwing * .7;                // a leap: front legs reach forward, back legs push back
      if (front && !far && P.pawRaise) { a += P.pawRaise * 1.1; footUp += P.pawRaise * .9; }
      if (!V.face || V.face === 'front') { footUp += Math.abs(a) * .3; a *= .15; }   // seen end-on, a swing only lifts the foot
      const foot = [hip[0] + Math.sin(a) * legV, hip[1] + Math.cos(a) * legV - footUp];
      if (!P.lift) foot[1] = Math.min(foot[1], 0);                  // standing feet never go through the ground
      const depth = far ? -1 + i * .01 : (front ? .5 : .4) + i * .01, w = pr.legWidth * (far ? .92 : 1);
      add('leg' + i, 'fur', depth, CG.tube([hip, foot], w, w * .95), far ? { dim: .3 } : {});
      add('paw' + i, 'cream', depth + .005, CG.ellipse(foot[0] + (V.face === 'side' || V.face === 'q' ? .12 : 0), foot[1] - .12, w * .62, .3, 16), far ? { dim: .3, line: .8 } : { line: .8 });
    });

    // ---- tail: a soft chain from the rump; hooked by default, alive with t ----
    {
      const T = V.tail, segs = 6, L = pr.tail / segs * (V.face === 'side' ? 1 : .78), dir = T.flipBend;
      const up = CG.clamp(E.tail, -1, 1), curl = CG.clamp(E.tailCurl);
      let a0 = T.a * Math.PI;
      if (up > 0) a0 = CG.lerp(a0, -Math.PI / 2, up); else a0 = CG.lerp(a0, (V.face === 'front' ? .1 : .85) * Math.PI * (dir < 0 ? 0 : 1) + (dir < 0 ? .15 : 0), -up);
      a0 = CG.lerp(a0, dir < 0 ? .05 : Math.PI * .97, curl);
      const hook = [0, .16, .26, .36, .46, .5].map(b => b * (1 - Math.max(0, up)) * (1 + Math.min(0, up) * .8));
      const bends = hook.map((b, i) => dir * (b * (1 - curl) + curl * -.32) + .09 * Math.sin(Math.PI * 2 * (.45 * t) - i * .7) * (1 + P.cycle));
      const root = [cx + T.x * (V.body === 'bean' ? bodyLen : halfW * 2), cy + T.y * bodyH / 2 * (V.body === 'bean' ? 1 : .6)];
      const path = pose(CG.chain(root, a0, new Array(segs).fill(L), bends));
      const depth = T.behind ? -.5 : 2.5, w = sp.tail && sp.tail.width || .8;
      add('tail', 'fur', depth, CG.tube(path, w, w * .85));
      const n = path.length, tipFrom = [CG.lerp(path[n - 2][0], path[n - 3][0], .35), CG.lerp(path[n - 2][1], path[n - 3][1], .35)];
      add('tailTip', 'cream', depth + .01, CG.tube([tipFrom, path[n - 2], path[n - 1]], w * .86, w * .85), { feature: 'tailTip' });
    }

    // ---- head group: head, ears, face, collar, bell (rotated together by headTilt) ----
    const hx = V.face === 'side' ? cx + bodyLen / 2 - headW * .15 : V.face === 'q' ? cx + bodyLen * V.headX : 0;
    const hy = cy - bodyH * .32 - headH * (V.face === 'side' ? .32 : .42), tilt = E.headTilt;
    const head = pts => pose(CG.rotate(pts, tilt, hx, hy));
    const headPts = CG.ellipse(hx, hy, headW / 2, headH / 2, 40), D = V.face ? 3 : -3;   // head depth band; behind the body from the back

    // collar on the neck, under the head; the bell at its front
    // the ends tuck behind the head (inside its outline), so only the band under it shows
    const collarPath = V.face === 'side' ? [[hx - headW * .4, hy + headH * .2], [hx - headW * .25, hy + headH * .52], [hx + headW * .02, hy + headH * .6]]
      : V.face === 'q' ? [[hx - headW * .38, hy + headH * .3], [hx - headW * .05, hy + headH * .6], [hx + headW * .33, hy + headH * .36]]
      : V.face === 'front' ? [[-headW * .36, hy + headH * .32], [0, hy + headH * .6], [headW * .36, hy + headH * .32]]
      : [[-headW * .4, cy - bodyH * .43], [0, cy - bodyH * .37], [headW * .4, cy - bodyH * .43]];
    add('collar', 'collar', V.face ? D - .05 : .3, (V.face ? head : pose)(CG.tube(collarPath, .3, .3, 3)), { feature: 'collar', line: .7 });
    if (V.face) {
      const bi = V.face === 'side' ? 2 : 1, bx = collarPath[bi][0] + (V.face === 'q' ? headW * .1 : 0), by = collarPath[bi][1] + .3;
      add('bell', 'bell', D + 2, head(CG.ellipse(bx, by, .34, .34, 18)), { feature: 'bell', line: .7 });
      add('bellSlit', 'line', D + 2.01, head([[bx - .15, by + .08], [bx + .15, by + .08]]), { feature: 'bell', stroke: 1, line: .4 });
    }

    // ears: rounded triangles on the head's top, turned by the expression
    const earDefs = V.face === 'side' ? [[hx - headW * .12, 1, 0], [hx + headW * .18, 0, 1]]
      : V.face === 'q' ? [[hx - headW * .18, 0, -1], [hx + headW * .3, 1, 1]] : [[hx - headW * .3, 0, -1], [hx + headW * .3, 0, 1]];
    const es = (sp.ears && sp.ears.size || 1), droop = Math.max(0, -E.ears), back = Math.max(0, E.ears);
    earDefs.forEach(([ex, far, side], i) => {
      const s = side || 1, w = .62 * es, h = 1.05 * es * (1 - .45 * back), by0 = hy - headH * .38 + Math.abs(ex - hx) * .2;
      let tri = [[ex - w, by0 + .1], [ex - w * .25, by0 - h * .9], [ex + w * .1 * s, by0 - h], [ex + w * .35, by0 - h * .75], [ex + w, by0 + .1]];
      tri = CG.rotate(tri, s * (droop * 1.25 + back * .55), ex, by0);
      if (droop) tri = CG.translate(tri, s * droop * .3, droop * .35);
      add('ear' + i, 'fur', D + (far ? -.6 : .3), head(tri), far ? { dim: .25 } : {});
      if (V.face && !far) {
        const c = tri.reduce((a, p) => [a[0] + p[0] / tri.length, a[1] + p[1] / tri.length], [0, 0]);
        add('earInner' + i, 'earInner', D + .31, head(CG.translate(CG.scale(tri, .55, .55, c[0], c[1]), 0, .12)), { feature: 'earInner', line: 0 });
      } else if (V.face && far && V.face !== 'side') {
        const c = tri.reduce((a, p) => [a[0] + p[0] / tri.length, a[1] + p[1] / tri.length], [0, 0]);
        add('earInner' + i, 'earInner', D - .59, head(CG.translate(CG.scale(tri, .5, .5, c[0], c[1]), 0, .12)), { feature: 'earInner', line: 0, dim: .25 });
      }
    });
    add('head', 'fur', D, head(headPts));

    // the face
    if (V.face) {
      const fx = V.face === 'front' ? hx : V.face === 'q' ? hx + headW * .14 : hx + headW * .3;
      const muzzle = V.face === 'side' ? CG.clipX(CG.ellipse(hx + headW * .3, hy + headH * .24, headW * .24, headH * .22, 24), hx + headW * .47, -1)
        : CG.drop(fx, hy + headH * .42, headW * (V.face === 'q' ? .38 : .44), headH * .62);
      add('muzzle', 'cream', D + .1, head(muzzle), { line: 0, feature: 'blaze' });
      const r = headW * .12, eyeY = hy + headH * .02, eo = { look: E.look, squint: E.squint };
      const eyeAt = V.face === 'front' ? [[fx - headW * .2, 1], [fx + headW * .2, 1]] : V.face === 'q' ? [[fx - headW * .2, .85], [fx + headW * .2, 1]] : [[fx + headW * .1, .9]];
      eyeAt.forEach(([ex, k], i) => FACES.eye(E.eyes, ex, eyeY, r * k, eo).parts.forEach(p => add('eye' + i + p.id, p.role, D + .5, head(p.pts), { line: p.line, stroke: p.stroke })));
      const ny = hy + headH * .24, nx = fx + (V.face === 'side' ? headW * .17 : 0);
      add('nose', 'line', D + .52, head([[nx - .13, ny - .06], [nx + .13, ny - .06], [nx, ny + .08]]), { line: 0 });
      FACES.mouth(E.mouth, nx, ny + .22, .55).parts.forEach(p => add('mouth', p.role, D + .51, head(p.pts), { line: p.line, stroke: p.stroke }));
      const wh = (sx, x0) => [0, 1, 2].forEach(k => add('whisker', 'line', D + .53, head([[x0, ny + .02 + k * .13], [x0 + sx * .95, ny - .18 + k * .2]]), { stroke: 1, line: .35, feature: 'whiskers' }));
      if (V.face !== 'side') wh(-1, fx - headW * .3);
      wh(1, V.face === 'side' ? hx + headW * .5 : fx + headW * .3);
    }

    // order by depth, then mirror for flip
    parts.sort((a, b) => a.depth - b.depth);
    if (state.flip) for (const p of parts) p.pts = p.pts.map(([x, y]) => [-x, y]);
    const all = parts.flatMap(p => p.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    return { parts, bounds: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
  },
};
