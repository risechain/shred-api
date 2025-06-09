import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['./src/index.ts', './src/viem/index.ts'],
    platform: 'neutral',
    dts: true,
  },
])
