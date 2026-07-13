import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
  // Nest resuelve las dependencias por metadata de decoradores, que esbuild
  // (el transformador por defecto de vitest) no emite. SWC sí.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
