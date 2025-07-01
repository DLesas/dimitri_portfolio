import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:react/recommended"
  ),
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
];

export default eslintConfig;
