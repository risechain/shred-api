import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'rise-shred-client',
      fileName: (format) => `rise-shred-client.${format}.js`,
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      external: ['ethers', 'viem', 'viem/accounts'],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          ethers: 'ethers',
          viem: 'viem',
          'viem/accounts': 'viemAccounts',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  plugins: [
    dts({ 
      include: ['src/**/*.ts'],
      rollupTypes: true,
    }),
  ],
});