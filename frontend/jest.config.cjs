module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test/styleStub.js',
    // src/appConfig.js reads import.meta.env, which Jest cannot parse; tests use a stub.
    '^(\\.{1,2}/)+appConfig(\\.js)?$': '<rootDir>/src/test/configStub.js',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx', '!src/appConfig.js', '!src/test/**'],
};
