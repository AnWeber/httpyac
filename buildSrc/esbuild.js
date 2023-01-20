const esbuild = require('esbuild');

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }));
  },
};

const isWatchBuild = process.argv.indexOf('--watch') >= 0;
const noMinify = process.argv.indexOf('--no-minify') >= 0;
const noExternal = process.argv.indexOf('--no-external') >= 0;

async function build() {
  const options = {
    logLevel: 'info',
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    minify: !noMinify,
    platform: 'node',
    sourcemap: true,
    target: 'node14',
    plugins: noExternal ? [] : [makeAllPackagesExternalPlugin],
  };

  if (isWatchBuild) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }
}

build().catch(() => process.exit(1));
