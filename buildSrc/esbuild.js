const esbuild = require('esbuild')

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

esbuild.build({
  logLevel: "info",
  entryPoints: ['./src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  minify: true,
  platform: 'node',
  sourcemap: true,
  target: 'node14',
  watch: process.argv.indexOf('--watch') >= 0,
  plugins: [makeAllPackagesExternalPlugin]
}).catch(() => process.exit(1))