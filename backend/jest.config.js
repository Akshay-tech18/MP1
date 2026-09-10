module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  verbose: true,
};
