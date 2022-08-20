module.exports = {
  roots: ['./src'],
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  testPathIgnorePatterns: ['./node_modules/'],
  transform: {
    '^.+\\.tsx?$': [
      '<rootDir>/buildSrc/jestEsbuildTransformer',
      {
        loader: 'ts',
        target: 'node16',
      },
    ],
  },
};
