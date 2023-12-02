// const { pathsToModuleNameMapper } = require('ts-jest');
// const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // roots: [
  //   '<rootDir>/tests'
  // ],
  // testMatch: [
  //   '**/__tests__/**/*.+(ts|tsx|js)',
  //   '**/?(*.)+(spec|test).+(ts|tsx|js)'
  // ],
  transform: {
    '^.+\\.(ts|tsx)?$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  //  '^.+\\.(js|jsx)$': 'babel-jest',
  },
  setupFiles: [
    '<rootDir>/tests/setup/index.js',
  ],
  setupFilesAfterEnv: [
    'jest-extended/all'
  ],
  modulePaths: [
    '<rootDir>',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@module$': '<rootDir>/static/module.json',
    '\\.(css|less|scss)$': '<rootDir>/tests/styleMock',   // prevent parsing stylesheets
    //...pathsToModuleNameMapper(compilerOptions.paths , { prefix: '<rootDir>/src/' } ),
  },
};
