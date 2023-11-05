module.exports = {
  roots: ['./src'],
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  testPathIgnorePatterns: ['./node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      '<rootDir>/buildSrc/jestEsbuildTransformer',
      {
        loader: 'ts',
        target: 'node20',
      },
    ],
  },
};
