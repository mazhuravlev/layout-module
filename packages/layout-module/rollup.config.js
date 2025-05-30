import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
import json from '@rollup/plugin-json'

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/esm/index.js',
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json', sourceMap: true }),
      postcss({
        modules: true,
        extract: false,
        minimize: true,
        use: {
          sass: {
            silenceDeprecations: ['legacy-js-api'],
          },
        },
        plugins: [autoprefixer()],
      }),
      json(),
    ],
    external: ['react', 'react-dom'],
    watch: {
      include: 'src/**',
      exclude: ['node_modules/**', 'dist/**', 'demo/**'],
      chokidar: {
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      },
    },
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/types/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
]
