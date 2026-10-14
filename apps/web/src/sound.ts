let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem("omok.muted") === "1";
  } catch {
    return false;
  }
})();

const audio = () => {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

export const isMuted = () => muted;
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem("omok.muted", value ? "1" : "0");
  } catch {
    // 무시
  }
}

/** 바둑돌 놓는 "딱" 소리를 합성한다 (음원 파일 없이) */
export function playStone(strength = 1) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;

  const len = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2200;
  band.Q.value = 1.2;
  const ng = ac.createGain();
  ng.gain.value = 0.5 * strength;
  noise.connect(band).connect(ng).connect(ac.destination);
  noise.start(t);

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.35 * strength, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.13);
}

export function playResult(win: boolean) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const notes = win ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66];
  notes.forEach((f, i) => {
    const t = ac.currentTime + i * 0.13;
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.4);
  });
}

/** 5목 폭발음. i가 커질수록 조금씩 높아져 연쇄 폭발처럼 들린다 */
export function playBurst(i: number) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;

  const len = Math.floor(ac.sampleRate * 0.35);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let n = 0; n < len; n++) data[n] = (Math.random() * 2 - 1) * Math.pow(1 - n / len, 2.5);
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const low = ac.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.setValueAtTime(3200 + i * 400, t);
  low.frequency.exponentialRampToValueAtTime(300, t + 0.3);
  const ng = ac.createGain();
  ng.gain.value = 0.32;
  noise.connect(low).connect(ng).connect(ac.destination);
  noise.start(t);

  const osc = ac.createOscillator();
  osc.type = "sine";
  const f = 150 * Math.pow(2, (i * 3) / 12);
  osc.frequency.setValueAtTime(f * 1.6, t);
  osc.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.22);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.4, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.26);
}
