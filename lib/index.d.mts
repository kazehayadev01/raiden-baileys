// Tipe untuk entry ESM (`import ... from '@kaze012/raiden-baileys'`).
// Isi tipe sama dengan entry CJS (lib/index.d.ts); hanya default export yang
// dipetakan eksplisit agar `import makeWASocket from '@kaze012/raiden-baileys'` bertipe fungsi.
import * as cjs from './index.js';

export * from './index.js';

declare const makeWASocket: typeof cjs.default;
export default makeWASocket;
