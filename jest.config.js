/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
//const { pathsToModuleNameMapper } = require('ts-jest/utils');
//const { compilerOptions } = require('./tsconfig.json');


module.exports = {
  // roots: [
  //   '<rootDir>/src'
  // ],
  // testMatch: [
  //   '**/__tests__/**/*.+(ts|tsx|js)',
  //   '**/?(*.)+(spec|test).+(ts|tsx|js)'
  // ],
  // transform: {
  //   '^.+\\.(ts|tsx)$': 'ts-jest'
  // },
  // setupFiles: [
  //   './tests-setup/foundryClasses.js',
  // ],
  // setupFilesAfterEnv: [
  //   'jest-extended/all'
  // ],
  // moduleNameMapper: {
  //   '^src/(.*)$': '<rootDir>/src/$1',
  //   ...pathsToModuleNameMapper(compilerOptions.paths , { prefix: '<rootDir>/' } ),
  // },
  testEnvironment: 'jsdom'
};
