import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vendor split: the first paint only needs react + the app; the 3D stack (three / r3f / post) and the
 * scene load after idle. Only react is split as a group: rolldown keeps everything else that only the lazy
 * World chunk uses out of the entry on its own. Do NOT use includeDependenciesRecursively:false: on
 * 2026-11-24 it broke the three chunk's linking and the scene crashed with "he is not a function".
 */
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'post', test: /node_modules[\\/](postprocessing|@react-three[\\/]postprocessing|n8ao)[\\/]/, priority: 20 },
            { name: 'r3f', test: /node_modules[\\/](@react-three|troika-|three-|maath|zustand|its-fine|suspend-react|camera-controls|@monogrid|stats|meshline|@use-gesture|detect-gpu|react-use-measure|tunnel-rat|hls)/, priority: 10 },
          ],
        },
      },
    },
  },
});
