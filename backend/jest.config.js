export default {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup-env.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/teardown.js"],
  collectCoverageFrom: ["src/**/*.js"],
  coverageThreshold: {
    global: {
      lines: 40,
      statements: 40,
      functions: 40,
      branches: 30
    }
  }
};
