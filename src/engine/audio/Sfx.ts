/** Sound effect hook. M6 replaces the body with the Web Audio synth; call sites stay the same. */
type Handler = (name: string) => void;
let handler: Handler | null = null;
export const setSfxHandler = (h: Handler): void => { handler = h; };
export const sfx = (name: string): void => handler?.(name);
