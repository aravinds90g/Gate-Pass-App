// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: "expo",
  ignorePatterns: ["/dist/*", "/android/*", "/node_modules/*"],
  globals: {
    // React Native provides these on the global object; eslint-config-expo
    // does not declare them, which produced no-undef errors on every timer.
    setTimeout: "readonly",
    clearTimeout: "readonly",
    setInterval: "readonly",
    clearInterval: "readonly",
    URL: "readonly",
    AbortController: "readonly",
    fetch: "readonly",
  },
};
