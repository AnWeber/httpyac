const { transformSync } = require('esbuild');

const defaultOptions = {
  format: 'cjs',
  sourcemap: 'both',
  platform: 'node',
  target: `node${process.versions.node}`,
};

module.exports = {
  createTransformer(userOptions) {
    return {
      canInstrument: true,
      process(sourceText, sourcePath) {
        const options = {
          ...defaultOptions,
          ...userOptions,
          sourcefile: sourcePath,
        };
        const { code, map } = transformSync(sourceText, options);
        return { code, map };
      },
    };
  },
};
