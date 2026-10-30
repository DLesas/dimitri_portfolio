import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import react from "eslint-plugin-react";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next already registers the react plugin; only add its recommended rules
  { rules: react.configs.flat.recommended.rules },
  {
    rules: {
      // React 17+ automatic JSX runtime - no need to import React for JSX
      "react/react-in-jsx-scope": "off",

      // Allow Three.js/R3F specific props
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            "args",
            "attach",
            "intensity",
            "transparent",
            "emissive",
            "emissiveIntensity",
            "position",
            "wireframe",
          ],
        },
      ],

      // Make unused vars warnings and allow _ prefix to ignore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Allow any types with warning (needed for third-party libs)
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow @ts-ignore with description
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
        },
      ],

      // Disable prop-types since we're using TypeScript
      "react/prop-types": "off",
    },
  },
  globalIgnores([
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "_archive/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
