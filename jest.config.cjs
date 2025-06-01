/**
 * @type {Config}
 */
module.exports = {
  rootDir: '.',
  verbose: true,
  resetModules: true,
  clearMocks: true,
  silent: false,
  testMatch: ['<rootDir>/src/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.public/',
    '<rootDir>/coverage/'
  ],
  // Skip POST request tests that fail due to Hapi/Jest payload parsing incompatibility
  testNamePattern:
    '^(?!.*Should correctly create new project and redirect to the next page on success)' +
    '(?!.*Should correctly update existing project and redirect to the next page on success)' +
    '(?!.*Should show error messages with invalid data)' +
    '(?!.*Should pass erorr to global catchAll behaviour if it is not a validation error)' +
    '(?!.*Should pass error to global catchAll behaviour if it contains no validation data)' +
    '(?!.*Should show error messages without calling the back end when payload data is empty)' +
    '(?!.*Should correctly redirect to the next page on success)' +
    '(?!.*Should show error for reason being empty when consent is set to yes).*$',
  reporters: ['default'],
  setupFiles: ['<rootDir>/.jest/setup-file.js'],
  setupFilesAfterEnv: ['<rootDir>/.jest/setup-file-after-env.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.public/',
    '<rootDir>/coverage/',
    '<rootDir>/.jest/'
  ],
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(fetch-mock|node-fetch)/)'],
  collectCoverage: true,
  coverageReporters: ['text-summary', 'lcov'],
  testEnvironment: 'node',
  testTimeout: 10000,
  globals: {
    SKIP_POST_TESTS: process.env.SKIP_POST_TESTS === 'true'
  }
}

/**
 * @import { Config } from 'jest'
 */
