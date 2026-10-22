// audio.js: the sounds a scene declares. Frames are drawn in parallel and out of order, so sounds aren't played while
// drawing: the scene lists them once, with the same times its animation uses, and render.mjs mixes them (tools/audio.mjs).
//   sounds({ sfx: [[t, 'caduta_tonfo', { vol, duck }], ...],                   effects from assets/sfx/; no number = the
//            ambience: [{ name: 'amb_notte_grilli_loop', from, to, fadeIn, fadeOut, vol }],   variations _01, _02… in turn
//            music: { file, vol } })                                           music ducks under effects (duck: false to skip)
// A loop declares them as LOOPS.name.sounds = { ... }. voice is reserved for later and refused for now.
const SCENE_SOUNDS = { sfx: [], ambience: [] };
function sounds(plan) {
  if (plan.sfx) SCENE_SOUNDS.sfx.push(...plan.sfx);
  if (plan.ambience) SCENE_SOUNDS.ambience.push(...plan.ambience);
  if (plan.music) SCENE_SOUNDS.music = plan.music;
  if (plan.voice) SCENE_SOUNDS.voice = plan.voice;
}
// What render.mjs reads: the plan of the loop being shown, or of the scene; its length; the project's music.
window.audioPlan = () => ({
  raw: window.LOOP ? window.LOOP.sounds || {} : SCENE_SOUNDS,
  duration: window.LOOP ? window.LOOP.len : DUR,
  music: PROJECT.music || PROJECT.audio || '',
});
