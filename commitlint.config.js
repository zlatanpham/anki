export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
      ],
    ],
    "subject-case": [2, "never", ["pascal-case", "upper-case"]],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
};
