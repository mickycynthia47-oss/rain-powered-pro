// Web Speech API helper
type SR = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { 0: { transcript: string } }[] & { isFinal?: boolean } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) return null;
  const sr = new Ctor();
  sr.continuous = false;
  sr.interimResults = true;
  sr.lang = "en-US";
  return sr;
}

// Web Audio synthesized ambient loops
let ctx: AudioContext | null = null;
let noiseNode: AudioBufferSourceNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let gainNode: GainNode | null = null;

function whiteNoiseBuffer(c: AudioContext, secs = 2) {
  const buf = c.createBuffer(1, c.sampleRate * secs, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function startAmbient(kind: "rain" | "ocean" | "coffee", volume: number) {
  stopAmbient();
  const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AC = W.AudioContext || W.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  noiseNode = ctx.createBufferSource();
  noiseNode.buffer = whiteNoiseBuffer(ctx);
  noiseNode.loop = true;
  filterNode = ctx.createBiquadFilter();
  gainNode = ctx.createGain();
  gainNode.gain.value = volume;

  if (kind === "rain") {
    filterNode.type = "highpass";
    filterNode.frequency.value = 1000;
  } else if (kind === "ocean") {
    filterNode.type = "lowpass";
    filterNode.frequency.value = 400;
    // slow LFO on gain for waves
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = volume * 0.6;
    lfo.connect(lfoGain).connect(gainNode.gain);
    lfo.start();
  } else {
    filterNode.type = "bandpass";
    filterNode.frequency.value = 600;
    filterNode.Q.value = 0.5;
  }
  noiseNode.connect(filterNode).connect(gainNode).connect(ctx.destination);
  noiseNode.start();
}

export function stopAmbient() {
  try { noiseNode?.stop(); } catch (_) { /* noop */ }
  try { ctx?.close(); } catch (_) { /* noop */ }
  noiseNode = null;
  filterNode = null;
  gainNode = null;
  ctx = null;
}

export function setAmbientVolume(v: number) {
  if (gainNode) gainNode.gain.value = v;
}
