export default {
  testEnvironment: 'jsdom',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  moduleNameMapper: {
    '^ethers$': '<rootDir>/tests/mocks/ethers.js',
  },
  verbose: true,
};
