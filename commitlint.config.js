/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow Jira-style prefixes: CORE-123: description
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
