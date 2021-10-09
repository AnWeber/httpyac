const esbuild = require('esbuild')

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

const isWatchBuild = process.argv.indexOf('--watch') >= 0;

esbuild.build({
  logLevel: "info",
  entryPoints: ['./src/index.ts'],
  outfile: 'dist/index.js',
  bundle: !isWatchBuild,
  minify: !isWatchBuild,
  platform: 'node',
  sourcemap: true,
  target: 'node14',
  watch: isWatchBuild,
  plugins: [makeAllPackagesExternalPlugin]
}).catch(() => process.exit(1))