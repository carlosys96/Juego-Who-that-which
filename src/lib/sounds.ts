'use client';

import * as Tone from 'tone';

let synth: Tone.Synth | null = null;
let music: Tone.Player | null = null;
let isMusicSetup = false;
let amSynth: Tone.AMSynth | null = null;


const setup = async () => {
  if (synth) return;
  await Tone.start();
  synth = new Tone.Synth().toDestination();
  amSynth = new Tone.AMSynth({
    harmonicity: 1.5,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.1, decay: 0, sustain: 1, release: 0.2 },
  }).toDestination();
};

const setupMusic = async () => {
  if (isMusicSetup) return;
  await setup();
  // Using a more ambient loop for background music
  const loop = new Tone.Loop(time => {
    amSynth?.triggerAttackRelease("C4", "2n", time);
    amSynth?.triggerAttackRelease("E4", "2n", time + Tone.Time("2n").toSeconds());
    amSynth?.triggerAttackRelease("G4", "2n", time + Tone.Time("1n").toSeconds());
  }, "1m").start(0);
  
  Tone.Transport.bpm.value = 70;
  Tone.Transport.swing = 0.5;

  isMusicSetup = true;
};

export const playCorrectSound = async () => {
  await setup();
  if (Tone.context.state !== 'running') {
    await Tone.context.resume();
  }
  const now = Tone.now();
  synth?.triggerAttackRelease('C4', '8n', now);
  synth?.triggerAttackRelease('G4', '8n', now + 0.2);
};

export const playIncorrectSound = async () => {
  await setup();
  if (Tone.context.state !== 'running') {
    await Tone.context.resume();
  }
  synth?.triggerAttackRelease('C3', '4n', Tone.now());
};

export const toggleMusic = async (play: boolean) => {
  await setupMusic();
  if (Tone.context.state !== 'running') {
    await Tone.context.resume();
  }

  if (play && Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  } else if (!play && Tone.Transport.state === 'started') {
    Tone.Transport.stop();
  }
};
