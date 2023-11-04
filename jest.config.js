module.exports = {
  roots: ['./src'],
  testTimeout: 5000,
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  testPathIgnorePatterns: ['./node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      '<rootDir>/buildSrc/jestEsbuildTransformer',
      {
        loader: 'ts',
        target: 'node18',
      },
    ],
  },
};
