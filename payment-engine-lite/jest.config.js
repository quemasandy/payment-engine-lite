/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/packages/domain/src/$1',
    '^@ports/(.*)$': '<rootDir>/packages/ports/src/$1',
    '^@lib/(.*)$': '<rootDir>/packages/lib/src/$1',
    '^@gateways/(.*)$': '<rootDir>/packages/gateways/src/$1',
    '^@adapters/(.*)$': '<rootDir>/packages/adapters/src/$1'
  }
}
