// Browser polyfills used by the demo app and SDK
// These must be imported BEFORE any other modules that might use Buffer

import { Buffer } from 'buffer';

// Make Buffer globally available for packages that expect Node's Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = Buffer;

// Ensure crypto.randomUUID exists in environments that lack it (e.g., some in-app webviews)
const ensureCryptoUUID = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}));
  if (!g.crypto) {
    g.crypto = {};
  }

  // Fallback getRandomValues if missing
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = (array: Uint8Array) => {
      for (let i = 0; i < array.length; i += 1) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }

  if (typeof g.crypto.randomUUID !== 'function') {
    g.crypto.randomUUID = () => {
      const bytes = new Uint8Array(16);
      g.crypto.getRandomValues(bytes);
      // Version 4 UUID per RFC 4122
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      const hex = Array.from(bytes, toHex).join('');
      return (
        hex.slice(0, 8) + '-' +
        hex.slice(8, 12) + '-' +
        hex.slice(12, 16) + '-' +
        hex.slice(16, 20) + '-' +
        hex.slice(20)
      );
    };
  }
};

ensureCryptoUUID();
