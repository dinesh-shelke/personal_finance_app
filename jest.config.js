/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|react-native-svg))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/types/**', '!src/**/*.d.ts'],
  moduleNameMapper: {
    // Must precede the '@/' mappings: the real module needs a native SQLite
    // runtime that Jest does not have. See the stub for the full reasoning.
    '^expo-sqlite/localStorage/install$':
      '<rootDir>/test-mocks/expo-sqlite-localstorage-install.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
