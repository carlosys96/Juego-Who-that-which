'use client';

import * as Tone from 'tone';

let synth: Tone.Synth | null = null;
let music: Tone.Player | null = null;
let isMusicSetup = false;

const setup = async () => {
  if (synth) return;
  await Tone.start();
  synth = new Tone.Synth().toDestination();
};

const setupMusic = async () => {
  if (isMusicSetup) return;
  await Tone.start();
  // Using a simple loop for background music
  const loop = new Tone.Loop(time => {
    synth?.triggerAttackRelease("C2", "8n", time);
    synth?.triggerAttackRelease("G2", "8n", time + Tone.Time("8n").toSeconds());
    synth?.triggerAttackRelease("E2", "8n", time + Tone.Time("4n").toSeconds());
  }, "4n").start(0);
  Tone.Transport.bpm.value = 80;
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
