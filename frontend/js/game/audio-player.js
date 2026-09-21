/**
 * Sodales — lecteur audio (partie extraite de game.html)
 * Ambiances procédurales (Web Audio), file d'attente, générateurs, playlists,
 * upload audio et synchronisation des pistes via socket.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
const PROCEDURAL_PRESETS = [
  // Météo & nature
  { id: 'pluie',     icon: '🌧️', name: 'Pluie douce',        desc: 'Bruit brun, bruissement' },
  { id: 'tempete',   icon: '⛈️', name: 'Tempête',             desc: 'Pluie forte + tonnerre' },
  { id: 'vent',      icon: '💨', name: 'Vent',                desc: 'Rafales oscillantes' },
  { id: 'ocean',     icon: '🌊', name: 'Océan',               desc: 'Vagues rythmiques' },
  { id: 'foret',     icon: '🌲', name: 'Forêt de jour',       desc: 'Murmure naturel' },
  { id: 'nuit',      icon: '🌙', name: 'Forêt la nuit',       desc: 'Grillons, chouettes' },
  // Lieux
  { id: 'donjon',    icon: '🏰', name: 'Donjon',              desc: 'Drone grave + gouttes' },
  { id: 'taverne',   icon: '🍺', name: 'Taverne animée',      desc: 'Foule, verres, feu' },
  { id: 'caverne',   icon: '⛏️', name: 'Caverne',             desc: 'Écho profond + ruisseau' },
  { id: 'marche',    icon: '🏘️', name: 'Marché médiéval',     desc: 'Foule, vendeurs' },
  { id: 'eglise',    icon: '⛪', name: 'Cathédrale',          desc: 'Réverbération, paix' },
  { id: 'bateau',    icon: '⚓', name: 'Bateau',              desc: 'Craquements, vagues' },
  // Combat & tension
  { id: 'combat',    icon: '⚔️', name: 'Combat',              desc: 'Tension rythmée' },
  { id: 'boss',      icon: '🐉', name: 'Boss épique',         desc: 'Tension + battements' },
  { id: 'suspense',  icon: '😰', name: 'Suspense',            desc: 'Drones montants' },
  // Magie
  { id: 'magie',     icon: '✨', name: 'Atmosphère magique',  desc: 'Cristaux, harmoniques' },
];

// Musiques réelles — CC-BY Eric Matyas (soundimage.org), hébergées localement
const MUSIC_TRACKS = [
  { icon: '🧝', name: 'Fantaisie elfique',       url: '/music/fantaisie.mp3' },
  { icon: '🏰', name: 'Souterrains secrets',     url: '/music/souterrains.mp3' },
  { icon: '🌲', name: 'Notre Montagne',           url: '/music/montagne.mp3' },
  { icon: '🐉', name: 'Mystère du Dragon',        url: '/music/dragon.mp3' },
  { icon: '🍺', name: 'Trouble au Royaume',       url: '/music/taverne.mp3' },
  { icon: '💀', name: 'Monstres souterrains',     url: '/music/monstres.mp3' },
  { icon: '⚔️', name: 'Croisades Anciennes',      url: '/music/croisades.mp3' },
  { icon: '🗡️', name: 'Bataille des Anciens',     url: '/music/bataille.mp3' },
  { icon: '🌑', name: 'Ténèbres qui approchent',  url: '/music/tenebres.mp3' },
  { icon: '🏔️', name: 'Cité des Remparts',        url: '/music/cite.mp3' },
];

let audioCtx = null;
let activeNodes = [];        // noeuds Web Audio en cours
let audioFileEl = null;      // <audio> pour les fichiers uploadés
let audioPlaying = false;
let audioLooping = true;
let audioVolume = 0.7;
let currentAudioType = null; // 'preset' | 'file'
let currentPresetId = null;
let currentFileUrl = null;
let customTracks = (() => { try { return JSON.parse(localStorage.getItem('vtt_custom_tracks')||'[]'); } catch { return []; } })();
let audioPanelOpen = false;
// ── Queue & nouvelles fonctionnalités ────────────────────────
let audioQueue = [];          // [{type, preset, url, name}]
let audioQueueIdx = -1;       // index courant dans la queue
let audioShuffleMode = false;
let audioProgressInterval = null;
let queueVisible = true;
let audioCrossfadeDuration = 1.5; // secondes de fondu enchaîné

function initAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// ── Générateurs procéduraux ───────────────────────────────────
function makeBrownNoise(ctx, vol = 1) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = (last + 0.02 * w) / 1.02;
    last = d[i];
    d[i] *= 3.5;
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g);
  return { src, g };
}

function makeWhiteNoise(ctx, vol = 1) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g);
  return { src, g };
}

function makeDrone(ctx, freq, vol = 0.08, wave = 'sine') {
  const osc = ctx.createOscillator(); osc.type = wave; osc.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  osc.connect(g);
  return { osc, g };
}

function startPreset(id, masterGain) {
  const ctx = audioCtx;
  const nodes = [];

  if (id === 'pluie') {
    const { src, g } = makeBrownNoise(ctx, 0.55);
    g.connect(masterGain); src.start();
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 1800;
    g.connect(lpf); lpf.connect(masterGain);
    nodes.push(src, g, lpf);

  } else if (id === 'vent') {
    const { src, g } = makeWhiteNoise(ctx, 0.18);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 600; bpf.Q.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(bpf); bpf.connect(masterGain);
    g.connect(masterGain);
    src.start(); lfo.start();
    nodes.push(src, g, bpf, lfo, lfoG);

  } else if (id === 'donjon') {
    const d1 = makeDrone(ctx, 55, 0.12); d1.osc.connect(d1.g); d1.g.connect(masterGain); d1.osc.start();
    const d2 = makeDrone(ctx, 82.5, 0.05); d2.osc.connect(d2.g); d2.g.connect(masterGain); d2.osc.start();
    const { src: ns, g: ng } = makeBrownNoise(ctx, 0.06);
    ng.connect(masterGain); ns.start();
    // Lente oscillation
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.04;
    lfo.connect(lfoG); lfoG.connect(d1.g.gain); lfo.start();
    nodes.push(d1.osc, d1.g, d2.osc, d2.g, ns, ng, lfo, lfoG);

  } else if (id === 'combat') {
    // Drone tendu
    const d = makeDrone(ctx, 110, 0.09, 'sawtooth'); d.osc.connect(d.g); d.g.connect(masterGain); d.osc.start();
    const d2 = makeDrone(ctx, 165, 0.04, 'square'); d2.osc.connect(d2.g); d2.g.connect(masterGain); d2.osc.start();
    // Pulsation rythmique (100 BPM)
    const bpm = 100; const beat = 60 / bpm;
    const pulseG = ctx.createGain(); pulseG.gain.value = 0;
    pulseG.connect(masterGain);
    const pulseNs = makeWhiteNoise(ctx, 0.4); pulseNs.src.connect(pulseNs.g); pulseNs.g.connect(pulseG); pulseNs.src.start();
    let t = ctx.currentTime;
    for (let i = 0; i < 200; i++) {
      pulseG.gain.setValueAtTime(0.5, t);
      pulseG.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      t += beat;
    }
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 2500;
    pulseNs.g.connect(lpf); lpf.connect(pulseG);
    nodes.push(d.osc, d.g, d2.osc, d2.g, pulseNs.src, pulseNs.g, pulseG, lpf);

  } else if (id === 'foret') {
    const { src, g } = makeWhiteNoise(ctx, 0.06);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1200; bpf.Q.value = 0.3;
    src.connect(bpf); bpf.connect(masterGain); g.connect(masterGain); src.start();
    const d = makeDrone(ctx, 220, 0.03, 'sine'); d.osc.connect(d.g); d.g.connect(masterGain);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.025;
    lfo.connect(lfoG); lfoG.connect(d.g.gain); d.osc.start(); lfo.start();
    nodes.push(src, g, bpf, d.osc, d.g, lfo, lfoG);

  } else if (id === 'tempete') {
    // Pluie forte
    const { src: rs, g: rg } = makeBrownNoise(ctx, 0.7);
    rg.connect(masterGain); rs.start();
    // Vent hurlant
    const { src: ws, g: wg } = makeWhiteNoise(ctx, 0.25);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 800; bpf.Q.value = 0.4;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.18;
    lfo.connect(lfoG); lfoG.connect(wg.gain);
    ws.connect(bpf); bpf.connect(masterGain); ws.start(); lfo.start();
    // Grondements de tonnerre (toutes les ~8s)
    const tG = ctx.createGain(); tG.gain.value = 0; tG.connect(masterGain);
    const { src: ts, g: tng } = makeBrownNoise(ctx, 0.9); ts.connect(tng); tng.connect(tG); ts.start();
    let thunder = ctx.currentTime + 3;
    for (let i=0;i<30;i++) {
      thunder += 5 + Math.random()*10;
      tG.gain.setValueAtTime(0, thunder);
      tG.gain.linearRampToValueAtTime(0.8, thunder+0.15);
      tG.gain.exponentialRampToValueAtTime(0.001, thunder+2.5);
    }
    nodes.push(rs,rg,ws,wg,bpf,lfo,lfoG,tG,ts,tng);

  } else if (id === 'ocean') {
    // Vagues cycliques
    const { src, g } = makeBrownNoise(ctx, 0.5);
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 800;
    src.connect(lpf); lpf.connect(masterGain); src.start();
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.09; // ~11s par vague
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.35;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    g.connect(masterGain); lfo.start();
    nodes.push(src, g, lpf, lfo, lfoG);

  } else if (id === 'nuit') {
    // Grillons (haute fréquence périodique)
    const { src, g } = makeWhiteNoise(ctx, 0.04);
    const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 4000;
    src.connect(hpf); hpf.connect(masterGain); src.start();
    // Chouette (notes basses pulsées)
    const owl = makeDrone(ctx, 440, 0.0, 'sine');
    owl.osc.connect(owl.g); owl.g.connect(masterGain); owl.osc.start();
    let t = ctx.currentTime + 2;
    for (let i=0; i<40; i++) {
      t += 4 + Math.random()*8;
      owl.g.gain.setValueAtTime(0, t);
      owl.g.gain.linearRampToValueAtTime(0.06, t+0.15);
      owl.g.gain.exponentialRampToValueAtTime(0.001, t+0.8);
      owl.g.gain.setValueAtTime(0, t+0.9);
      owl.g.gain.linearRampToValueAtTime(0.04, t+1.1);
      owl.g.gain.exponentialRampToValueAtTime(0.001, t+1.6);
    }
    // Silence relatif + brise légère
    const { src: ws, g: wg } = makeWhiteNoise(ctx, 0.03);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 500; bpf.Q.value = 0.8;
    ws.connect(bpf); bpf.connect(masterGain); ws.start();
    nodes.push(src, g, hpf, owl.osc, owl.g, ws, wg, bpf);

  } else if (id === 'taverne') {
    // Bruit de foule (bruit brun filtré)
    const { src: cs, g: cg } = makeBrownNoise(ctx, 0.2);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 600; bpf.Q.value = 0.8;
    cs.connect(bpf); bpf.connect(masterGain); cs.start();
    // Feu de cheminée (crépitements)
    const { src: fs, g: fg } = makeWhiteNoise(ctx, 0.04);
    const flpf = ctx.createBiquadFilter(); flpf.type = 'bandpass'; flpf.frequency.value = 3000; flpf.Q.value = 2;
    fs.connect(flpf); flpf.connect(masterGain); fs.start();
    // Musique folk basse (drone)
    const d = makeDrone(ctx, 196, 0.04, 'sawtooth'); d.osc.connect(d.g); d.g.connect(masterGain); d.osc.start();
    const d2 = makeDrone(ctx, 293, 0.02, 'sawtooth'); d2.osc.connect(d2.g); d2.g.connect(masterGain); d2.osc.start();
    nodes.push(cs,cg,bpf,fs,fg,flpf,d.osc,d.g,d2.osc,d2.g);

  } else if (id === 'caverne') {
    // Ruisseau souterrain
    const { src: ws, g: wg } = makeWhiteNoise(ctx, 0.12);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 400; bpf.Q.value = 0.5;
    ws.connect(bpf); bpf.connect(masterGain); ws.start();
    // Gouttes d'eau
    const drip = ctx.createOscillator(); drip.type = 'sine'; drip.frequency.value = 1200;
    const drG = ctx.createGain(); drG.gain.value = 0;
    drip.connect(drG); drG.connect(masterGain); drip.start();
    let td = ctx.currentTime + 1;
    for (let i=0; i<100; i++) {
      td += 0.8 + Math.random()*3;
      drG.gain.setValueAtTime(0, td);
      drG.gain.linearRampToValueAtTime(0.08, td+0.02);
      drG.gain.exponentialRampToValueAtTime(0.001, td+0.3);
    }
    // Drone profond
    const d = makeDrone(ctx, 40, 0.08); d.osc.connect(d.g); d.g.connect(masterGain); d.osc.start();
    nodes.push(ws,wg,bpf,drip,drG,d.osc,d.g);

  } else if (id === 'marche') {
    // Foule animée
    const { src, g } = makeBrownNoise(ctx, 0.22);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 800; bpf.Q.value = 0.6;
    src.connect(bpf); bpf.connect(masterGain); src.start();
    // Cloches de marchand
    const bell = ctx.createOscillator(); bell.type = 'sine'; bell.frequency.value = 880;
    const bG = ctx.createGain(); bG.gain.value = 0;
    bell.connect(bG); bG.connect(masterGain); bell.start();
    let tb = ctx.currentTime + 2;
    for (let i=0; i<40; i++) {
      tb += 3 + Math.random()*7;
      bG.gain.setValueAtTime(0, tb);
      bG.gain.linearRampToValueAtTime(0.07, tb+0.04);
      bG.gain.exponentialRampToValueAtTime(0.001, tb+1.2);
    }
    nodes.push(src,g,bpf,bell,bG);

  } else if (id === 'eglise') {
    // Réverbération grave
    const d1 = makeDrone(ctx, 110, 0.06, 'sine'); d1.osc.connect(d1.g); d1.g.connect(masterGain); d1.osc.start();
    const d2 = makeDrone(ctx, 165, 0.03, 'sine'); d2.osc.connect(d2.g); d2.g.connect(masterGain); d2.osc.start();
    const d3 = makeDrone(ctx, 220, 0.02, 'sine'); d3.osc.connect(d3.g); d3.g.connect(masterGain); d3.osc.start();
    // Lente oscillation de chorale
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.02;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.03;
    lfo.connect(lfoG); lfoG.connect(d1.g.gain); lfo.start();
    nodes.push(d1.osc,d1.g,d2.osc,d2.g,d3.osc,d3.g,lfo,lfoG);

  } else if (id === 'bateau') {
    // Craquements de bois
    const { src, g } = makeBrownNoise(ctx, 0.08);
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 300; bpf.Q.value = 1.5;
    src.connect(bpf); bpf.connect(masterGain); src.start();
    // Vagues
    const { src: ws, g: wg } = makeBrownNoise(ctx, 0.3);
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 600;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.25;
    lfo.connect(lfoG); lfoG.connect(wg.gain);
    ws.connect(lpf); lpf.connect(masterGain); ws.start(); lfo.start();
    // Vent
    const { src: fws, g: fwg } = makeWhiteNoise(ctx, 0.05);
    fws.connect(fwg); fwg.connect(masterGain); fws.start();
    nodes.push(src,g,bpf,ws,wg,lpf,lfo,lfoG,fws,fwg);

  } else if (id === 'boss') {
    // Drone très grave
    const d = makeDrone(ctx, 55, 0.15, 'sawtooth'); d.osc.connect(d.g); d.g.connect(masterGain); d.osc.start();
    const d2 = makeDrone(ctx, 82, 0.08, 'square'); d2.osc.connect(d2.g); d2.g.connect(masterGain); d2.osc.start();
    // Battements de tambour lents (60 BPM)
    const beat = 60/60;
    const drumG = ctx.createGain(); drumG.gain.value = 0; drumG.connect(masterGain);
    const { src: ds, g: dg } = makeBrownNoise(ctx, 0.9); ds.connect(dg); dg.connect(drumG); ds.start();
    let td = ctx.currentTime;
    for (let i=0; i<200; i++) {
      td += beat;
      drumG.gain.setValueAtTime(0.8, td);
      drumG.gain.exponentialRampToValueAtTime(0.001, td+0.25);
    }
    nodes.push(d.osc,d.g,d2.osc,d2.g,ds,dg,drumG);

  } else if (id === 'suspense') {
    // Drone montant lent
    const d = makeDrone(ctx, 80, 0.12, 'sawtooth'); d.osc.connect(d.g); d.g.connect(masterGain); d.osc.start();
    d.osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 60);
    // Trémolos rapides
    const lfo = ctx.createOscillator(); lfo.frequency.value = 8;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.06;
    lfo.connect(lfoG); lfoG.connect(d.g.gain); lfo.start();
    // Bruits graves
    const { src, g } = makeBrownNoise(ctx, 0.07); src.connect(g); g.connect(masterGain); src.start();
    nodes.push(d.osc,d.g,lfo,lfoG,src,g);

  } else if (id === 'magie') {
    // Harmoniques cristallines
    const freqs = [523, 659, 784, 1047, 1319];
    freqs.forEach((f, i) => {
      const d = makeDrone(ctx, f, 0.025, 'sine');
      d.osc.connect(d.g); d.g.connect(masterGain); d.osc.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i*0.03;
      const lg = ctx.createGain(); lg.gain.value = 0.015;
      lfo.connect(lg); lg.connect(d.g.gain); lfo.start();
      nodes.push(d.osc,d.g,lfo,lg);
    });
    // Scintillements (bruit haute fréquence pulsé)
    const { src, g } = makeWhiteNoise(ctx, 0.03);
    const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 5000;
    src.connect(hpf); hpf.connect(masterGain); src.start();
    nodes.push(src,g,hpf);
  }
  return nodes;
}

// ── File d'attente ────────────────────────────────────────────
function addToQueue(type, preset, url, name) {
  audioQueue.push({ type, preset, url, name });
  renderQueue();
  showQueueSection(true);
}

function removeFromQueue(idx) {
  if (idx < audioQueueIdx) audioQueueIdx--;
  else if (idx === audioQueueIdx && audioPlaying) {
    audioPlayNext(); return;
  }
  audioQueue.splice(idx, 1);
  renderQueue();
  if (!audioQueue.length) showQueueSection(false);
}

function clearQueue() {
  audioQueue = [];
  audioQueueIdx = -1;
  renderQueue();
  showQueueSection(false);
}

function renderQueue() {
  const list = document.getElementById('audioQueueList');
  const label = document.getElementById('audioQueueLabel');
  if (!list) return;
  label.textContent = `File d'attente (${audioQueue.length})`;
  if (!audioQueue.length) { list.innerHTML = '<div style="padding:.4rem .7rem;font-size:.72rem;color:var(--text2);">Vide — cliquez ＋ pour ajouter</div>'; return; }
  list.innerHTML = audioQueue.map((t, i) => `
    <div class="audio-queue-item${i === audioQueueIdx ? ' current' : ''}">
      <span style="font-size:.7rem;width:14px;text-align:center;color:var(--text2);">${i + 1}</span>
      <span class="audio-queue-item-name" title="${esc(t.name)}">${i === audioQueueIdx ? '▶ ' : ''}${esc(t.name)}</span>
      <button class="audio-queue-del" data-act="removeFromQueue" data-a='[${i}]' title="Retirer">✕</button>
    </div>`).join('');
}

function showQueueSection(show) {
  const s = document.getElementById('audioQueueSection');
  if (s) s.style.display = show ? '' : 'none';
}

function toggleQueueView() {
  queueVisible = !queueVisible;
  const l = document.getElementById('audioQueueList');
  const icon = document.getElementById('audioQueueToggleIcon');
  if (l) l.style.display = queueVisible ? '' : 'none';
  if (icon) icon.textContent = queueVisible ? '▾' : '▸';
}

// ── Navigation queue ──────────────────────────────────────────
function audioPlayNext() {
  if (!audioQueue.length) { audioStop(); return; }
  let next;
  if (audioShuffleMode) {
    next = Math.floor(Math.random() * audioQueue.length);
  } else {
    next = audioQueueIdx + 1;
    if (next >= audioQueue.length) {
      if (audioLooping) { next = 0; }
      else { audioStop(); clearQueue(); return; }
    }
  }
  audioQueueIdx = next;
  const t = audioQueue[audioQueueIdx];
  audioPlayInternal(t.type, t.preset, t.url, t.name);
  renderQueue();
  socket?.emit('audio_play', { campaign_id: CAMPAIGN_ID, type: t.type, preset: t.preset, url: t.url, track_name: t.name, loop: audioLooping, volume: audioVolume });
}

function audioPlayPrev() {
  if (!audioQueue.length) return;
  let prev = audioShuffleMode
    ? Math.floor(Math.random() * audioQueue.length)
    : Math.max(0, audioQueueIdx - 1);
  audioQueueIdx = prev;
  const t = audioQueue[audioQueueIdx];
  audioPlayInternal(t.type, t.preset, t.url, t.name);
  renderQueue();
  socket?.emit('audio_play', { campaign_id: CAMPAIGN_ID, type: t.type, preset: t.preset, url: t.url, track_name: t.name, loop: audioLooping, volume: audioVolume });
}

// ── Shuffle ───────────────────────────────────────────────────
function audioToggleShuffle() {
  audioShuffleMode = !audioShuffleMode;
  document.getElementById('audioShuffleBtn')?.classList.toggle('active', audioShuffleMode);
}

// ── Progression ───────────────────────────────────────────────
function startProgressInterval() {
  stopProgressInterval();
  if (currentAudioType !== 'file') return;
  const row = document.getElementById('audioProgressRow');
  if (row) row.style.display = '';
  audioProgressInterval = setInterval(() => {
    if (!audioFileEl || !audioFileEl.duration) return;
    const pct = (audioFileEl.currentTime / audioFileEl.duration) * 100;
    const fill = document.getElementById('audioProgressFill');
    const time = document.getElementById('audioTimeDisplay');
    if (fill) fill.style.width = pct + '%';
    if (time) {
      const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      time.textContent = `${fmt(audioFileEl.currentTime)} / ${fmt(audioFileEl.duration)}`;
    }
  }, 500);
}

function stopProgressInterval() {
  if (audioProgressInterval) { clearInterval(audioProgressInterval); audioProgressInterval = null; }
  const row = document.getElementById('audioProgressRow');
  if (row) row.style.display = 'none';
  const fill = document.getElementById('audioProgressFill');
  if (fill) fill.style.width = '0%';
}

function audioSeek(event) {
  if (!audioFileEl || !audioFileEl.duration) return;
  const bar = document.getElementById('audioProgressBar');
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  audioFileEl.currentTime = ratio * audioFileEl.duration;
}

// ── Fade in / out ─────────────────────────────────────────────
function audioFadeIn(duration = 0.9) {
  const master = activeNodes[0];
  if (!master?.gain || !audioCtx) return;
  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(audioVolume, audioCtx.currentTime + Math.max(0.05, duration));
}

function audioFadeOut(duration, callback) {
  const master = activeNodes[0];
  if (!master?.gain || !audioCtx || duration <= 0) { if (callback) callback(); return; }
  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(master.gain.value || audioVolume, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  // Also fade file element if present
  if (audioFileEl) {
    const startVol = audioFileEl.volume;
    const step = startVol / (duration * 30);
    const iv = setInterval(() => {
      if (!audioFileEl) { clearInterval(iv); return; }
      audioFileEl.volume = Math.max(0, audioFileEl.volume - step);
      if (audioFileEl.volume <= 0.001) clearInterval(iv);
    }, 33);
  }
  if (callback) setTimeout(callback, duration * 1000);
}

// ── Lecteur audio fichier ─────────────────────────────────────
ACT.selectAudioTrackRow = (url, name, ev) => {
  if (!ev.target.closest('.audio-track-add,.audio-track-del')) selectAudioTrack('file', null, url, name);
};
ACT.renameCustomTrackGm = (idx) => { if (myRole === 'gm') renameCustomTrack(idx); };
ACT.setCrossfade = function () {
  audioCrossfadeDuration = parseFloat(this.value);
  const t = document.getElementById('audioCrossfadeVal');
  if (t) t.textContent = this.value + 's';
};
ACT.queueFromEl = (el, ev) => { queueAudioTrack('file', null, el.dataset.url, el.dataset.name, ev); };
function ensureAudioEl() {
  if (!audioFileEl) {
    audioFileEl = document.createElement('audio');
    audioFileEl.loop = false;  // géré manuellement via la queue
    audioFileEl.volume = audioVolume;
    audioFileEl.addEventListener('ended', () => {
      // Piste terminée : jouer la suivante ou boucler
      if (audioQueue.length > 1 || (audioQueue.length === 1 && !audioLooping)) {
        audioPlayNext();
      } else if (audioLooping && currentAudioType === 'file') {
        audioFileEl.currentTime = 0;
        audioFileEl.play().catch(() => {});
      }
    });
    document.body.appendChild(audioFileEl);
  }
  return audioFileEl;
}

// ── Démarrer / arrêter ────────────────────────────────────────
// audioPlay : version publique utilisée par les sockets (sans màj queue)
function audioPlay(type, preset, url, trackName) {
  audioPlayInternal(type, preset, url, trackName);
}

// audioPlayInternal : cœur de la lecture
function audioPlayInternal(type, preset, url, trackName) {
  audioStop(true); // stop silencieux
  initAudioCtx();
  currentAudioType = type;
  currentPresetId = preset || null;
  currentFileUrl = url || null;
  audioPlaying = true;

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = audioVolume;
  masterGain.connect(audioCtx.destination);
  activeNodes = [masterGain];

  if (type === 'preset') {
    const nodes = startPreset(preset, masterGain);
    activeNodes.push(...nodes);
    stopProgressInterval();
  } else if (type === 'file' && url) {
    const el = ensureAudioEl();
    el.src = url;
    el.loop = false;  // on gère la boucle via l'événement ended
    el.volume = audioVolume;
    try {
      if (!el._srcNode) {
        el._srcNode = audioCtx.createMediaElementSource(el);
      }
      el._srcNode.disconnect();
      el._srcNode.connect(masterGain);
    } catch {
      // Fallback : lecture directe sans Web Audio
    }
    el.play().catch(err => console.warn('Audio play failed:', err));
    startProgressInterval();
  }

  // Fade-in
  audioFadeIn(0.8);

  setAudioEq(true);
  updateNowPlayingUI(trackName || 'En lecture…');
  highlightPlayingTrack(type === 'preset' ? preset : url);
}

function audioStop(silent = false) {
  stopProgressInterval();
  // Arrêter Web Audio
  activeNodes.forEach(n => {
    try { if (n.stop) n.stop(); } catch {}
    try { if (n.disconnect) n.disconnect(); } catch {}
  });
  activeNodes = [];
  // Arrêter le fichier
  if (audioFileEl) { audioFileEl.pause(); audioFileEl.src = ''; }
  audioPlaying = false;
  currentAudioType = null;
  currentPresetId = null;
  currentFileUrl = null;
  if (!silent) {
    setAudioEq(false);
    updateNowPlayingUI(null);
    highlightPlayingTrack(null);
    socket?.emit('audio_stop', { campaign_id: CAMPAIGN_ID });
  }
}

function audioPlayPause() {
  if (!audioPlaying) return;
  if (currentAudioType === 'preset') {
    const preset = currentPresetId;
    const name = document.getElementById('audioTrackName').textContent;
    audioStop(true);
    audioPlayInternal('preset', preset, null, name);
  } else if (audioFileEl) {
    if (audioFileEl.paused) {
      audioFileEl.play();
      setAudioEq(true);
      document.getElementById('audioPlayBtn').textContent = '⏸';
      startProgressInterval();
    } else {
      audioFileEl.pause();
      setAudioEq(false);
      document.getElementById('audioPlayBtn').textContent = '▶';
      stopProgressInterval();
      document.getElementById('audioProgressRow').style.display = '';
    }
  }
}

// ── Helper UI piste courante ──────────────────────────────────
function updateNowPlayingUI(name) {
  const el = document.getElementById('audioTrackName');
  const btn = document.getElementById('audioPlayBtn');
  if (!el) return;
  if (name) {
    el.textContent = name;
    el.style.color = 'var(--accent2)';
    el.style.fontStyle = 'normal';
    if (btn) btn.textContent = '⏸';
  } else {
    el.textContent = 'Aucune piste';
    el.style.color = 'var(--text2)';
    el.style.fontStyle = 'italic';
    if (btn) btn.textContent = '▶';
  }
  // Rafraîchir la vue joueur si elle est ouverte
  if (audioPanelOpen && myRole !== 'gm') refreshPlayerAudioView();
}

function audioToggleLoop() {
  audioLooping = !audioLooping;
  document.getElementById('audioLoopBtn').classList.toggle('active', audioLooping);
  if (audioFileEl) audioFileEl.loop = audioLooping;
}

function audioSetVolume(val) {
  audioVolume = val / 100;
  document.getElementById('audioVolLabel').textContent = val;
  // Ajuster le gain master
  const master = activeNodes[0];
  if (master?.gain) master.gain.value = audioVolume;
  if (audioFileEl) audioFileEl.volume = audioVolume;
  socket?.emit('audio_volume', { campaign_id: CAMPAIGN_ID, volume: audioVolume });
}

function audioSetLocalVolume(val) {
  const v = val / 100;
  document.getElementById('audioLocalVolLabel').textContent = val;
  const master = activeNodes[0];
  if (master?.gain) master.gain.value = v;
  if (audioFileEl) audioFileEl.volume = v;
}

function refreshPlayerAudioView() {
  const trackName = document.getElementById('audioTrackName')?.textContent;
  const isPlaying = trackName && trackName !== 'Aucune piste';
  const idle = document.getElementById('audioPlayerIdle');
  const track = document.getElementById('audioPlayerTrack');
  const progressWrap = document.getElementById('audioPlayerProgressWrap');
  const progressFill = document.getElementById('audioPlayerProgressFill');

  if (isPlaying) {
    idle.style.display = 'none';
    track.style.display = '';
    track.textContent = trackName;
    // Sync progress fill from GM bar
    const gmFill = document.getElementById('audioProgressFill');
    if (gmFill && progressWrap) {
      progressWrap.style.display = '';
      progressFill.style.width = gmFill.style.width || '0%';
    }
    // EQ animation in player view
    let eq = track.parentElement.querySelector('.audio-eq.player-eq');
    if (!eq) {
      eq = document.createElement('div');
      eq.className = 'audio-eq player-eq';
      eq.style.cssText = 'justify-content:center;margin:.3rem 0;';
      eq.innerHTML = '<span></span><span></span><span></span><span></span>';
      track.parentElement.insertBefore(eq, progressWrap);
    }
    eq.classList.toggle('paused', false);
  } else {
    idle.style.display = '';
    track.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'none';
    const eq = track.parentElement?.querySelector('.audio-eq.player-eq');
    if (eq) eq.remove();
  }
  // Sync progress periodically when player panel is open
  if (isPlaying && !window._playerProgressInterval) {
    window._playerProgressInterval = setInterval(() => {
      if (!audioPanelOpen || myRole === 'gm') { clearInterval(window._playerProgressInterval); window._playerProgressInterval = null; return; }
      const gmFill = document.getElementById('audioProgressFill');
      const fill = document.getElementById('audioPlayerProgressFill');
      if (gmFill && fill) fill.style.width = gmFill.style.width;
    }, 500);
  }
}

function setAudioEq(playing) {
  const row = document.querySelector('#audioNow .audio-now-row');
  if (!row) return;
  let eq = row.querySelector('.audio-eq');
  if (playing && !eq) {
    eq = document.createElement('div');
    eq.className = 'audio-eq';
    eq.innerHTML = '<span></span><span></span><span></span><span></span>';
    row.appendChild(eq);
  }
  if (eq) eq.classList.toggle('paused', !playing);
}

function highlightPlayingTrack(id) {
  document.querySelectorAll('.audio-track-row').forEach(r => {
    r.classList.toggle('playing', r.dataset.id === id);
  });
}

// ── Sélectionner une piste (MJ) — lecture immédiate + màj queue ──
function selectAudioTrack(type, preset, url, name) {
  if (myRole !== 'gm') return;
  // Si la piste est déjà dans la queue, pointer dessus; sinon remplacer
  const existIdx = audioQueue.findIndex(t => t.url === url && t.preset === preset);
  if (existIdx >= 0) {
    audioQueueIdx = existIdx;
  } else {
    const insertAt = audioQueueIdx >= 0 ? audioQueueIdx + 1 : 0;
    audioQueue.splice(insertAt, 0, { type, preset, url, name });
    audioQueueIdx = insertAt;
    renderQueue();
    showQueueSection(myRole === 'gm');
  }

  const doPlay = () => {
    audioPlayInternal(type, preset, url, name);
    socket?.emit('audio_play', { campaign_id: CAMPAIGN_ID, type, preset, url, track_name: name, loop: audioLooping, volume: audioVolume });
  };

  // Crossfade: si une piste est en cours, faire fondu avant de démarrer
  if (audioPlaying && audioCrossfadeDuration > 0) {
    audioFadeOut(audioCrossfadeDuration, doPlay);
  } else {
    doPlay();
  }
}

// ── Ajouter à la queue sans lancer la lecture ─────────────────
function queueAudioTrack(type, preset, url, name, event) {
  if (myRole !== 'gm') return;
  event?.stopPropagation();
  addToQueue(type, preset, url, name);
}

// ── Upload audio ──────────────────────────────────────────────
async function uploadAudioTrack(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const label = document.querySelector('label[for="audio-file-input"]');
  label.textContent = '⏳ Upload…';
  try {
    const { url } = await API.upload(file);
    const name = file.name.replace(/\.[^.]+$/, '');
    customTracks.push({ name, url });
    saveCustomTracks();
    renderCustomTracks();
    selectAudioTrack('file', null, url, name);
  } catch (err) {
    alert('Upload échoué : ' + err.message);
  } finally {
    label.innerHTML = '📎 Uploader une piste audio';
    fileInput.value = '';
  }
}

function saveCustomTracks() {
  try { localStorage.setItem('vtt_custom_tracks', JSON.stringify(customTracks)); } catch {}
}

function deleteCustomTrack(idx, event) {
  event?.stopPropagation();
  customTracks.splice(idx, 1);
  saveCustomTracks();
  renderCustomTracks();
}

function renameCustomTrack(idx) {
  const t = customTracks[idx];
  if (!t) return;
  const newName = prompt('Nouveau nom de la piste :', t.name);
  if (newName && newName.trim()) {
    customTracks[idx].name = newName.trim();
    saveCustomTracks();
    renderCustomTracks();
  }
}

function addTrackByUrl() {
  const input = document.getElementById('audioUrlInput');
  const url = input?.value.trim();
  if (!url) return;
  const name = url.split('/').pop().replace(/\.[^.]+$/, '') || 'Piste';
  customTracks.push({ name, url });
  saveCustomTracks();
  renderCustomTracks();
  selectAudioTrack('file', null, url, name);
  if (input) input.value = '';
}

function renderCustomTracks() {
  const list = document.getElementById('audioCustomTracks');
  const label = document.getElementById('audioCustomLabel');
  label.style.display = customTracks.length ? '' : 'none';
  list.innerHTML = customTracks.map((t, idx) => {
    const safeUrl = t.url.replace(/'/g, "\\'");
    const safeName = t.name.replace(/'/g, "\\'");
    const gmBtns = myRole === 'gm' ? `
      <button class="audio-track-add" data-act="queueFromEl" data-a='["$el"]' data-url="${safeUrl}" data-name="${safeName}" title="Ajouter à la file">＋</button>
      <button class="audio-track-del" data-act="deleteCustomTrack" data-a='[${idx}, "$event"]' title="Supprimer">🗑</button>` : '';
    return `<div class="audio-track-row" data-id="${esc(t.url)}"
      data-act="selectAudioTrackRow" data-url="${safeUrl}" data-name="${safeName}"
      data-act="renameCustomTrackGm" data-a='[${idx}]'>
      <span class="audio-track-icon">🎵</span>
      <span class="audio-track-name" title="Double-clic pour renommer">${esc(t.name)}</span>
      ${gmBtns}
    </div>`;
  }).join('');
}

function buildAudioTrackList() {
  const list = document.getElementById('audioTrackList');
  const existing = list.querySelectorAll('.audio-track-row');
  if (existing.length > 0) return; // déjà construit

  const frag = document.createDocumentFragment();

  // Section ambiances procédurales
  PROCEDURAL_PRESETS.forEach(p => {
    const div = document.createElement('div');
    div.className = 'audio-track-row';
    div.dataset.id = p.id;
    div.title = p.desc;
    const addBtn = myRole === 'gm'
      ? `<button class="audio-track-add" data-act="queueAudioTrack" data-a='["preset", "${p.id}", null, "${p.icon} ${p.name}", "$event"]' title="Ajouter à la file">＋</button>`
      : '';
    div.innerHTML = `<span class="audio-track-icon">${p.icon}</span><span class="audio-track-name">${p.name}</span>${addBtn}`;
    if (myRole === 'gm') {
      div.addEventListener('click', e => { if (!e.target.closest('.audio-track-add')) selectAudioTrack('preset', p.id, null, `${p.icon} ${p.name}`); });
    }
    frag.appendChild(div);
  });

  // Séparateur et section musiques réelles
  const sep = document.createElement('div');
  sep.className = 'audio-section-label';
  sep.textContent = 'Musiques (CC-BY soundimage.org)';
  frag.appendChild(sep);

  MUSIC_TRACKS.forEach(t => {
    const div = document.createElement('div');
    div.className = 'audio-track-row';
    div.dataset.id = t.url;
    const tname = `${t.icon} ${t.name}`;
    const addBtn = myRole === 'gm'
      ? `<button class="audio-track-add" data-act="queueFromEl" data-a='["$el"]' data-url="${t.url}" data-name="${tname.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" title="Ajouter à la file">＋</button>`
      : '';
    div.innerHTML = `<span class="audio-track-icon">${t.icon}</span><span class="audio-track-name">${t.name}</span>${addBtn}`;
    if (myRole === 'gm') {
      div.addEventListener('click', e => { if (!e.target.closest('.audio-track-add')) selectAudioTrack('file', null, t.url, tname); });
    }
    frag.appendChild(div);
  });

  // Insérer avant le label "pistes uploadées"
  list.insertBefore(frag, document.getElementById('audioCustomLabel'));
}

// ── Playlists sauvegardées ────────────────────────────────────
const MAX_PLAYLISTS = 4;
function loadSavedPlaylists() {
  try { return JSON.parse(localStorage.getItem('vtt_playlists')||'[]'); } catch { return []; }
}
function saveSavedPlaylists(playlists) {
  try { localStorage.setItem('vtt_playlists', JSON.stringify(playlists)); } catch {}
}

function saveCurrentPlaylist(slotIdx) {
  if (!audioQueue.length) { alert('La file d\'attente est vide.'); return; }
  const name = prompt(`Nom pour la playlist #${slotIdx+1} :`, `Playlist ${slotIdx+1}`);
  if (!name) return;
  const playlists = loadSavedPlaylists();
  while (playlists.length <= slotIdx) playlists.push(null);
  playlists[slotIdx] = { name: name.trim(), tracks: [...audioQueue] };
  saveSavedPlaylists(playlists);
  renderSavedPlaylists();
}

function loadPlaylist(slotIdx) {
  const playlists = loadSavedPlaylists();
  const pl = playlists[slotIdx];
  if (!pl || !pl.tracks?.length) return;
  audioQueue = [...pl.tracks];
  audioQueueIdx = -1;
  renderQueue();
  showQueueSection(true);
  // Lancer la première piste
  audioQueueIdx = 0;
  const t = audioQueue[0];
  const doPlay = () => {
    audioPlayInternal(t.type, t.preset, t.url, t.name);
    socket?.emit('audio_play', { campaign_id: CAMPAIGN_ID, type: t.type, preset: t.preset, url: t.url, track_name: t.name, loop: audioLooping, volume: audioVolume });
  };
  if (audioPlaying && audioCrossfadeDuration > 0) audioFadeOut(audioCrossfadeDuration, doPlay);
  else doPlay();
  renderQueue();
}

function deletePlaylist(slotIdx, event) {
  event?.stopPropagation();
  if (!confirm('Supprimer cette playlist ?')) return;
  const playlists = loadSavedPlaylists();
  playlists[slotIdx] = null;
  saveSavedPlaylists(playlists);
  renderSavedPlaylists();
}

function renderSavedPlaylists() {
  const row = document.getElementById('audioPlaylistRow');
  if (!row) return;
  const playlists = loadSavedPlaylists();
  let html = '';
  for (let i = 0; i < MAX_PLAYLISTS; i++) {
    const pl = playlists[i] || null;
    html += `<div class="audio-playlist-slot">
      <button class="audio-pl-btn ${pl ? 'filled' : ''}" data-act="${pl ? 'loadPlaylist' : 'saveCurrentPlaylist'}" data-a="[${i}]" title="${pl ? `▶ ${pl.name} (${pl.tracks.length} pistes)` : 'Sauvegarder la file courante'}">${pl ? esc(pl.name.substring(0,8)) : `PL${i+1}`}</button>
      <button class="audio-pl-save-btn" data-act="saveCurrentPlaylist" data-a='[${i}]' title="Sauvegarder la file courante ici">💾</button>
      ${pl ? `<button class="audio-pl-del-btn" data-act="deletePlaylist" data-a='[${i}, "$event"]' title="Supprimer">✕</button>` : ''}
    </div>`;
  }
  row.innerHTML = html;
}

// ── Toggle panneau ────────────────────────────────────────────
// ── Code d'invitation ─────────────────────────────────────────
function showInviteCode() {
  const code = campaign?.invite_code || '???';
  const url  = `${location.origin}/lobby.html`;
  const msg  = `Code d'invitation : ${code}\n\nPartage ce code dans le lobby pour rejoindre la campagne "${campaign?.name}".`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      alert(`✅ Code copié !\n\n${msg}`);
    }).catch(() => alert(msg));
  } else {
    alert(msg);
  }
}

function toggleAudioPanel() {
  audioPanelOpen = !audioPanelOpen;
  const panel = document.getElementById('audioPanel');
  panel.classList.toggle('visible', audioPanelOpen);
  if (audioPanelOpen) {
    const isGm = myRole === 'gm';
    const panel = document.getElementById('audioPanel');
    panel.classList.toggle('player-mode', !isGm);
    // Sections MJ
    document.getElementById('audioNow').style.display             = isGm ? '' : 'none';
    document.getElementById('audioControls').style.display        = isGm ? '' : 'none';
    document.getElementById('audioCrossfadeRow').style.display    = isGm ? '' : 'none';
    document.getElementById('audioPlayerControls').style.display  = 'none';
    document.getElementById('audioUploadRow').style.display       = isGm ? '' : 'none';
    document.getElementById('audioUrlRow').style.display          = isGm ? '' : 'none';
    document.getElementById('audioPlaylistRow').style.display     = isGm ? '' : 'none';
    document.getElementById('audioTrackList').style.display       = isGm ? '' : 'none';
    document.getElementById('audioQueueSection').style.display    = isGm ? (audioQueue.length ? '' : 'none') : 'none';
    // Vue joueur
    const playerView = document.getElementById('audioPlayerView');
    playerView.style.display = isGm ? 'none' : 'flex';
    if (!isGm) refreshPlayerAudioView();
    if (isGm) {
      buildAudioTrackList();
      document.getElementById('audioLoopBtn')?.classList.toggle('active', audioLooping);
      document.getElementById('audioShuffleBtn')?.classList.toggle('active', audioShuffleMode);
      if (audioQueue.length) { renderQueue(); showQueueSection(true); }
      renderSavedPlaylists();
      renderCustomTracks();
    }
  }
}

// ── Socket listeners audio ────────────────────────────────────
function setupAudioSocket(socket) {
  socket.on('audio_state', ({ type, preset, url, track_name, loop, volume }) => {
    audioLooping = loop;
    audioVolume = volume;
    const vol100 = Math.round(volume * 100);
    document.getElementById('audioVolSlider').value = vol100;
    document.getElementById('audioLocalVol').value = vol100;
    document.getElementById('audioVolLabel').textContent = vol100;
    document.getElementById('audioLocalVolLabel').textContent = vol100;
    audioPlay(type, preset, url, track_name);
  });

  socket.on('audio_stopped', () => {
    audioStop(true);
    setAudioEq(false);
    updateNowPlayingUI(null);
    highlightPlayingTrack(null);
  });

  socket.on('audio_volume', ({ volume }) => {
    if (myRole === 'gm') return;
    audioVolume = volume;
    const master = activeNodes[0];
    if (master?.gain) master.gain.value = volume;
    if (audioFileEl) audioFileEl.volume = volume;
    document.getElementById('audioLocalVol').value = Math.round(volume * 100);
    document.getElementById('audioLocalVolLabel').textContent = Math.round(volume * 100);
  });
}

// ══════════════════════════════════════════════════════════════
// UPLOAD D'IMAGES
// ══════════════════════════════════════════════════════════════
async function uploadImageGame(fileInput, urlFieldId, onDone) {
  const file = fileInput.files[0];
  if (!file) return;
  const label = fileInput.previousElementSibling;
  label.textContent = '⏳';
  label.classList.add('loading');
  try {
    const { url } = await API.upload(file);
    document.getElementById(urlFieldId).value = url;
    // Preview bg si nécessaire
    const preview = document.getElementById('bg-preview');
    if (preview && urlFieldId === 'bg-url') {
      preview.src = url;
      preview.style.display = 'block';
    }
    if (onDone) onDone();
  } catch (err) {
    alert('Upload échoué : ' + err.message);
  } finally {
    label.textContent = '📎';
    label.classList.remove('loading');
    fileInput.value = '';
  }
}
