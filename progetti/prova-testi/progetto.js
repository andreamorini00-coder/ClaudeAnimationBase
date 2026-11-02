// prova-testi: a short vertical reel with two subtitles and a title, to see the texts layer (src/testi.js) in the frame.
//   node render.mjs --progetto=prova-testi --controlla-testi [--lettura=bambini]     the reading check
//   node render.mjs --progetto=prova-testi --stills=0.9,2.5,6 [--safe]                frames;  --srt  writes the subtitles
window.PROGETTO = { duration: 8, bpm: 120, offset: 0, style: 'cozy', format: 'vertical', music: '', scene: ['scena.js'] };
