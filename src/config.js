// config.js: project settings.
//   duration: the video's length in seconds.
//   bpm:      the rhythm that bounces, dances and pulse() follow. Clawd always moves to some beat; if the video has music,
//             set this to the song's tempo, and set offset to the time in seconds of its first downbeat.
//   style:    the look, one of the files in src/styles/ (studio.html?style=name or render.mjs --style=name overrides it).
//   format:   the frame, picked before anything is drawn: 'landscape' 1920×1080, 'vertical' 1080×1920 (reels, stories),
//             'feed' 1080×1350 (Instagram posts). ?format=name / --format=name override it. See "Social formats" in
//             ANIMATION_GUIDE.md.
//   music:    an optional music file for the whole video (a scene's sounds({ music }) or --music=file override it).
const PROJECT = { duration: 11, bpm: 120, offset: 0, style: 'classic', format: 'landscape', music: '' };
