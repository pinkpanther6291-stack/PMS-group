const API_BASE = ((): string => {
  // Allow overriding for production via environment variable VITE_API_BASE
  try {
    // Vite exposes env vars starting with VITE_
    // eslint-disable-next-line no-undef
    const v = (typeof process !== 'undefined' && (process.env as any).VITE_API_BASE) || undefined;
    if (v) return v;
  } catch (e) {
    // ignore
  }
  return 'http://localhost:5000';
})();

export default API_BASE;
