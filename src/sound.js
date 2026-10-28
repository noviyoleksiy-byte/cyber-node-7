// manage web audio synth and music
// makes cyberpunk tones with zero mp3
export class SoundEngine {
constructor() {
this.ctx = null;
this.soundEnabled = true;
this.musicEnabled = true;
this.soundVol = 0.8;
this.musicVol = 0.45;
this.musicTimer = null;
this.stepIdx = 0;
this.customAudio = null;
this.customUrl = '';
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
// richer synth chord on 9+ and 10+
playDischarge(count, isResonance) {
const notes =
count >= 9
? [330, 440, 554, 659, 880, 1174]
: [293, 370, 440, 587, 740];
for (
let i = 0;
i < notes.length;
i++
) {
this.playTone(
notes[i],
notes[i] * 1.4,
0.22,
'sawtooth',
0.18,
i * 0.045
);
}
if (isResonance) {
this.playTone(
140,
880,
0.48,
'square',
0.24,
0.1
);
this.playTone(
960,
1760,
0.38,
'triangle',
0.25,
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

// start procedural bassline loop
// plays soft cyber arpeggio in bg
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
const bass = [
110, 130.8, 146.8, 164.8, 146.8,
130.8, 98, 110,
];
this.musicTimer = setInterval(() => {
if (
!this.musicEnabled ||
!this.ctx ||
this.ctx.state !== 'running'
) {
return;
}
const f =
bass[this.stepIdx % bass.length];
this.stepIdx++;
const now = this.ctx.currentTime;
const osc =
this.ctx.createOscillator();
const gain = this.ctx.createGain();
osc.type = 'triangle';
osc.frequency.setValueAtTime(f, now);
const v = Math.max(
0.001,
this.musicVol * 0.09
);
const gParam = gain.gain;
gParam.setValueAtTime(0.0001, now);
gParam.linearRampToValueAtTime(
v,
now + 0.04
);
gParam.exponentialRampToValueAtTime(
0.0001,
now + 0.34
);
osc.connect(gain);
gain.connect(this.ctx.destination);
osc.start(now);
osc.stop(now + 0.36);
}, 380);
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
