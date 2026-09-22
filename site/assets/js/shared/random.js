// FNV-1a hashes UTF-16 text into the Mulberry32 state. Preserve this sequence
// and callers' draw order so existing seeds continue to reproduce their data.
export function createRandom(seed) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619) >>> 0;
  }
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
export const pick = (rng, values) => values[randomInt(rng, 0, values.length - 1)];

export function createSeed() {
  return [...crypto.getRandomValues(new Uint32Array(2))]
    .map(number => number.toString(16).padStart(8, '0')).join('');
}
