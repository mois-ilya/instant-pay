// Browser polyfills used by the demo app and SDK
// In Vite, 'buffer' may be externalized in build. Prefer globalThis.Buffer if SDK set it.
// Dynamically import only if missing.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ensureBuffer = async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}));
  if (!g.Buffer) {
    const mod = await import('buffer');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const B: any = (mod as any).Buffer || (mod as any).default?.Buffer;
    if (B) {
      g.Buffer = B;
    }
  }
};

void ensureBuffer();

// Ensure global Buffer exists for libraries that expect Node's Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Other polyfills can be ensured here

