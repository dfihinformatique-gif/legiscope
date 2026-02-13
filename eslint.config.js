import { includeIgnoreFile } from "@eslint/compat"
import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import sveltePlugin from "eslint-plugin-svelte"
import globals from "globals"
import { fileURLToPath } from "node:url"
import svelteParser from "svelte-eslint-parser"
import ts from "typescript-eslint"
import svelteConfig from "./svelte.config.js"

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url))

export default [
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...sveltePlugin.configs.recommended,
	prettier,
	...sveltePlugin.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
		rules: { "no-undef": "off" },
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".svelte"],
				parser: ts.parser,
				svelteConfig,
			},
		},
		plugins: {
			svelte: sveltePlugin,
		},
		rules: {
			...sveltePlugin.configs.recommended.rules,
		},
	},
]
