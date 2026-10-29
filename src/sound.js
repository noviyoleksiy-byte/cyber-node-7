// build web audio synth and music
// plays 4 skin tracks with zero mp3
const TRACKS = {
obsidian: {
stepMs: 160,
roots: [55, 43.65, 36.71, 41.2],
chords: [
[220, 261.6, 329.6, 392],
[174.6, 220, 261.6, 329.6],
[146.8, 220, 261.6, 349.2],
[164.8, 246.9, 293.7, 392],
],
scale: [
220, 246.9, 261.6, 293.7,
329.6, 392, 440, 523.3,
587.3, 659.3,
],
bassPattern: [
1, 0, 0, 1, 0, 0, 1, 0,
1, 0, 1, 0, 0, 1, 0, 0,
],
leadWave: 'triangle',
bassWave: 'sawtooth',
},
matrix: {
stepMs: 142,
roots: [73.42, 58.27, 49.0, 55.0],
chords: [
[146.8, 174.6, 220, 261.6],
[116.5, 174.6, 220, 293.7],
[196, 233.1, 293.7, 349.2],
[220, 277.2, 329.6, 392],
],
scale: [
293.7, 329.6, 349.2, 392,
440, 466.2, 523.3, 587.3,
659.3, 698.5,
],
bassPattern: [
1, 0, 1, 1, 0, 1, 0, 1,
1, 0, 0, 1, 1, 0, 1, 0,
],
leadWave: 'sawtooth',
bassWave: 'square',
},
synthwave: {
stepMs: 152,
roots: [46.25, 36.71, 61.74, 69.3],
chords: [
[185, 220, 277.2, 329.6],
[146.8, 185, 220, 277.2],
[123.5, 185, 220, 293.7],
[138.6, 207.7, 246.9, 329.6],
],
scale: [
185, 207.7, 220, 246.9,
277.2, 293.7, 329.6, 370,
440, 554.4,
],
bassPattern: [
1, 1, 1, 1, 1, 1, 1, 1,
1, 1, 1, 1, 1, 1, 1, 1,
],
leadWave: 'sawtooth',
bassWave: 'sawtooth',
},
arctic: {
stepMs: 170,
roots: [65.41, 51.91, 43.65, 49.0],
chords: [
[130.8, 155.6, 196, 293.7],
[103.8, 155.6, 196, 261.6],
[174.6, 207.7, 261.6, 311.1],
[196, 246.9, 293.7, 392],
],
scale: [
261.6, 293.7, 311.1, 392,
415.3, 466.2, 523.3, 587.3,
622.3, 784,
],
bassPattern: [
1, 0, 0, 0, 1, 0, 1, 0,
0, 0, 1, 0, 0, 1, 0, 0,
],
leadWave: 'sine',
bassWave: 'triangle',
},
};

// export main sound and music class
// keeps sfx and reactive music synced
export class SoundEngine {
constructor() {
this.ctx = null;
this.soundEnabled = true;
this.musicEnabled = true;
this.soundVol = 0.8;
this.musicVol = 0.45;
this.musicTimer = null;
this.stepIdx = 0;
this.cycleIdx = 0;
this.customAudio = null;
this.customUrl = '';
this.themeId = 'obsidian';
this.activeTrackId = 'obsidian';
this.fillRatio = 0.15;
this.hasSelection = false;
this.isMoving = false;
this.boostActive = false;
this.inMenu = true;
}

// wake up audio context on tap
// browsers block audio before gesture
wake() {
if (typeof window === 'undefined') {
return;
}
if (!this.ctx) {
const AC =
window.AudioContext ||
window.webkitAudioContext;
if (AC) {
this.ctx = new AC();
}
}
if (
this.ctx &&
this.ctx.state === 'suspended'
) {
this.ctx.resume().catch(() => {});
}
}

// update live board state for music
// switches track when skin changes
setContext(info) {
if (!info) {
return;
}
if (
info.themeId &&
TRACKS[info.themeId]
) {
this.themeId = info.themeId;
if (
this.musicTimer &&
this.activeTrackId !== this.themeId
) {
this.startMusic();
}
}
if (
typeof info.fillRatio === 'number'
) {
this.fillRatio = info.fillRatio;
}
if (
typeof info.hasSelection === 'boolean'
) {
this.hasSelection = info.hasSelection;
}
if (
typeof info.isMoving === 'boolean'
) {
this.isMoving = info.isMoving;
}
if (
typeof info.boostActive === 'boolean'
) {
this.boostActive = info.boostActive;
}
if (
typeof info.inMenu === 'boolean'
) {
this.inMenu = info.inMenu;
}
}

// play single synth oscillator note
// ramps gain smoothly to avoid clicks
playTone(
freq,
endFreq,
dur,
type = 'sine',
vol = 0.25,
delay = 0
) {
if (!this.soundEnabled) {
return;
}
this.wake();
if (!this.ctx) {
return;
}
const now =
this.ctx.currentTime + delay;
const osc =
this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = type;
osc.frequency.setValueAtTime(
freq,
now
);
if (endFreq !== freq) {
const fParam = osc.frequency;
fParam.exponentialRampToValueAtTime(
Math.max(20, endFreq),
now + dur
);
}
const peak =
Math.max(0.001, vol * this.soundVol);
const gParam = gain.gain;
gParam.setValueAtTime(0.0001, now);
gParam.linearRampToValueAtTime(
peak,
now + 0.015
);
gParam.exponentialRampToValueAtTime(
0.0001,
now + dur
);
osc.connect(gain);
gain.connect(this.ctx.destination);
osc.start(now);
osc.stop(now + dur + 0.02);
}

// play filtered warm music voice
// uses lowpass filter for rich tone
playMusicVoice(
freq,
dur,
type,
vol,
cutoff,
attack = 0.02,
detune = 0
) {
if (
!this.musicEnabled ||
!this.ctx ||
this.ctx.state !== 'running'
) {
return;
}
const now = this.ctx.currentTime;
const osc =
this.ctx.createOscillator();
const flt =
this.ctx.createBiquadFilter();
const gain = this.ctx.createGain();
osc.type = type;
osc.frequency.setValueAtTime(
freq,
now
);
if (detune !== 0) {
osc.detune.setValueAtTime(
detune,
now
);
}
flt.type = 'lowpass';
flt.frequency.setValueAtTime(
Math.max(80, cutoff),
now
);
flt.Q.setValueAtTime(1.8, now);
const peak = Math.max(
0.0005,
vol * this.musicVol
);
const gParam = gain.gain;
gParam.setValueAtTime(0.0001, now);
gParam.linearRampToValueAtTime(
peak,
now + attack
);
gParam.exponentialRampToValueAtTime(
0.0001,
now + dur
);
osc.connect(flt);
flt.connect(gain);
gain.connect(this.ctx.destination);
osc.start(now);
osc.stop(now + dur + 0.03);
}

// play soft synthesized drum hit
// makes kick, hat, and cyber rim
playDrum(kind, vol = 0.1) {
if (
!this.musicEnabled ||
!this.ctx ||
this.ctx.state !== 'running'
) {
return;
}
const now = this.ctx.currentTime;
const osc =
this.ctx.createOscillator();
const gain = this.ctx.createGain();
const peak = Math.max(
0.0005,
vol * this.musicVol
);
if (kind === 'kick') {
osc.type = 'sine';
osc.frequency.setValueAtTime(
125,
now
);
osc.frequency
.exponentialRampToValueAtTime(
36,
now + 0.11
);
gain.gain.setValueAtTime(peak, now);
gain.gain
.exponentialRampToValueAtTime(
0.0001,
now + 0.14
);
osc.connect(gain);
gain.connect(this.ctx.destination);
osc.start(now);
osc.stop(now + 0.16);
return;
}
if (kind === 'rim') {
osc.type = 'triangle';
osc.frequency.setValueAtTime(
390,
now
);
osc.frequency
.exponentialRampToValueAtTime(
140,
now + 0.06
);
gain.gain.setValueAtTime(
peak * 0.7,
now
);
gain.gain
.exponentialRampToValueAtTime(
0.0001,
now + 0.07
);
osc.connect(gain);
gain.connect(this.ctx.destination);
osc.start(now);
osc.stop(now + 0.08);
return;
}
const flt =
this.ctx.createBiquadFilter();
flt.type = 'highpass';
flt.frequency.setValueAtTime(
3200,
now
);
osc.type = 'square';
osc.frequency.setValueAtTime(
5400,
now
);
osc.frequency
.exponentialRampToValueAtTime(
1900,
now + 0.035
);
gain.gain.setValueAtTime(
peak * 0.35,
now
);
gain.gain
.exponentialRampToValueAtTime(
0.0001,
now + 0.04
);
osc.connect(flt);
flt.connect(gain);
gain.connect(this.ctx.destination);
osc.start(now);
osc.stop(now + 0.05);
}

// play crisp blip when picking node
// gives immediate tactile feedback
playSelect() {
this.playTone(
520,
780,
0.07,
'triangle',
0.22
);
}

// play fast wire pulse on node move
// pitches up slightly along path
playStep(idx = 0) {
const base =
340 + Math.min(10, idx) * 36;
this.playTone(
base,
base * 1.25,
0.055,
'sine',
0.16
);
}

// play electric arc when ring bounces
// sounds like holographic spark jump
playBounce() {
this.playTone(
680,
290,
0.14,
'sawtooth',
0.18
);
this.playTone(
420,
940,
0.11,
'triangle',
0.2,
0.05
);
}

// play lightning discharge for 7+
// harmonizes with active skin chord
playDischarge(count, isResonance) {
const tr =
TRACKS[this.themeId] ||
TRACKS.obsidian;
const sc = tr.scale;
const len = count >= 9 ? 6 : 5;
for (let i = 0; i < len; i++) {
const f = sc[(i * 2) % sc.length];
this.playTone(
f,
f * 1.25,
0.22,
'sawtooth',
0.17,
i * 0.045
);
}
if (isResonance) {
this.playTone(
140,
880,
0.48,
'square',
0.22,
0.1
);
this.playTone(
960,
1760,
0.38,
'triangle',
0.23,
0.2
);
}
}

// play booster activation sound
// distinct cue for undo, laser, warp
playBooster(kind) {
if (kind === 'undo') {
this.playTone(
620,
310,
0.16,
'triangle',
0.22
);
} else if (kind === 'laser') {
this.playTone(
1200,
180,
0.22,
'sawtooth',
0.25
);
} else {
this.playTone(
280,
1120,
0.24,
'sine',
0.25
);
}
}

// play level clear cyber fanfare
// ascending arpeggio when table done
playLevelWin() {
const seq = [
440, 554, 659, 880, 1108,
];
for (let i = 0; i < seq.length; i++) {
this.playTone(
seq[i],
seq[i] * 1.05,
0.2,
'triangle',
0.24,
i * 0.08
);
}
}

// play board overload power down
// low descending synth chord
playGameOver() {
const seq = [360, 310, 250, 170];
for (let i = 0; i < seq.length; i++) {
this.playTone(
seq[i],
seq[i] * 0.85,
0.24,
'sawtooth',
0.2,
i * 0.1
);
}
}

// run one 16th-note music sequencer
// evolves over 256 steps (16 bars)
tickMusicStep() {
if (
!this.musicEnabled ||
!this.ctx ||
this.ctx.state !== 'running'
) {
return;
}
const tr =
TRACKS[this.activeTrackId] ||
TRACKS.obsidian;
const s = this.stepIdx;
const bar = Math.floor(s / 16);
const stepInBar = s % 16;
const section = Math.floor(bar / 4);
const chordIdx = bar % 4;
const chord = tr.chords[chordIdx];
const root = tr.roots[chordIdx];

this.stepIdx = (s + 1) % 256;
if (this.stepIdx === 0) {
this.cycleIdx++;
}

// scale filter brightness by state
// opens up on full board or boost
const menuMul =
this.inMenu ? 0.68 : 1.0;
const tension =
Math.min(1, this.fillRatio * 1.25);
const boostAdd =
this.boostActive ? 650 : 0;
const baseCut =
(420 + tension * 950 + boostAdd) *
menuMul;

// play lush pad chord on bar start
// swells gently across 4-bar phrase
if (stepInBar === 0) {
const padDur =
(tr.stepMs * 15.5) / 1000;
for (
let i = 0;
i < chord.length;
i++
) {
const pf =
section === 3 && i === 0
? chord[i] * 2
: chord[i];
this.playMusicVoice(
pf,
padDur,
'sine',
0.055 * menuMul,
baseCut * 1.1,
0.28,
i * 4 - 6
);
if (
this.activeTrackId === 'synthwave'
) {
this.playMusicVoice(
pf,
padDur,
'sawtooth',
0.032 * menuMul,
baseCut * 0.85,
0.32,
8
);
}
}
}

// play bassline with octave groove
// skips heavy bass in breakdown bar
const bassHit =
tr.bassPattern[stepInBar];
if (bassHit && section !== 3) {
const oct =
stepInBar % 4 === 2 &&
(section >= 1 || this.boostActive)
? 2
: 1;
const bFreq = root * oct;
const bDur =
(tr.stepMs * 1.8) / 1000;
this.playMusicVoice(
bFreq,
bDur,
tr.bassWave,
0.11 * menuMul,
baseCut * 0.72,
0.015,
0
);
} else if (
section === 3 &&
stepInBar === 0
) {
this.playMusicVoice(
root,
(tr.stepMs * 12) / 1000,
'sine',
0.12 * menuMul,
320,
0.08,
0
);
}

// play percussion by skin & context
// skate electro & tension add groove
if (!this.inMenu) {
const isSkate =
this.activeTrackId === 'matrix';
const isSynth =
this.activeTrackId === 'synthwave';
if (
stepInBar === 0 ||
(isSkate && stepInBar === 10) ||
(!isSkate &&
stepInBar === 8 &&
section !== 3)
) {
this.playDrum('kick', 0.14);
}
if (
(isSkate ||
isSynth ||
tension > 0.5) &&
(stepInBar === 4 ||
stepInBar === 12) &&
section !== 3
) {
this.playDrum('rim', 0.09);
}
const hatActive =
isSkate ||
this.boostActive ||
tension > 0.45 ||
stepInBar % 4 === 2;
if (
hatActive &&
stepInBar % 2 === 1
) {
this.playDrum('hat', 0.06);
}
}

// play evolving arpeggio sequence
// shifts pattern by section & cycle
const arpActive =
section >= 1 ||
this.hasSelection ||
this.isMoving ||
this.activeTrackId === 'obsidian' ||
this.activeTrackId === 'arctic';
if (
arpActive &&
stepInBar % 2 === 0
) {
const patShift =
(stepInBar / 2 +
bar +
this.cycleIdx) %
chord.length;
const octMul =
stepInBar === 6 ||
stepInBar === 14 ||
this.isMoving
? 2
: 1;
const aFreq =
chord[patShift] * octMul;
this.playMusicVoice(
aFreq,
(tr.stepMs * 2.2) / 1000,
'triangle',
0.055 * menuMul,
baseCut * 1.5,
0.012,
3
);
}

// add extra 16th signal pulse on move
// reacts live when player picks node
if (
(this.hasSelection ||
this.isMoving ||
this.boostActive) &&
stepInBar % 2 === 1
) {
const sc = tr.scale;
const idx =
(stepInBar + bar * 3) % sc.length;
const sFreq =
sc[idx] * (this.isMoving ? 2 : 1);
this.playMusicVoice(
sFreq,
(tr.stepMs * 1.4) / 1000,
'sine',
0.048,
baseCut * 2.1,
0.008,
0
);
}

// play melodic lead in bars 5 to 16
// uses skin scale and phrase rests
const leadOn =
(section === 1 &&
stepInBar % 4 === 0) ||
(section === 2 &&
(stepInBar === 0 ||
stepInBar === 3 ||
stepInBar === 6 ||
stepInBar === 10 ||
stepInBar === 12)) ||
(section === 3 &&
(stepInBar === 2 ||
stepInBar === 8 ||
stepInBar === 14));
if (leadOn) {
const sc = tr.scale;
const noteHash =
(bar * 5 +
stepInBar * 3 +
this.cycleIdx * 2) %
sc.length;
const lFreq = sc[noteHash];
const lDur =
(tr.stepMs * 3.6) / 1000;
this.playMusicVoice(
lFreq,
lDur,
tr.leadWave,
0.068 * menuMul,
baseCut * 1.75,
0.02,
-5
);
}
}

// start procedural skin soundtrack
// locks timer to active skin tempo
startMusic() {
this.stopMusic();
if (!this.musicEnabled) {
return;
}
if (this.customUrl) {
try {
this.customAudio = new Audio(
this.customUrl
);
this.customAudio.loop = true;
this.customAudio.volume =
this.musicVol;
this.customAudio
.play()
.catch(() => {});
return;
} catch (_e) {
this.customAudio = null;
}
}
this.activeTrackId =
this.themeId || 'obsidian';
const tr =
TRACKS[this.activeTrackId] ||
TRACKS.obsidian;
this.musicTimer = setInterval(() => {
this.tickMusicStep();
}, tr.stepMs);
}

// stop background music loop
// called on pause or mute toggle
stopMusic() {
if (this.musicTimer) {
clearInterval(this.musicTimer);
this.musicTimer = null;
}
if (this.customAudio) {
this.customAudio.pause();
this.customAudio = null;
}
}
}
