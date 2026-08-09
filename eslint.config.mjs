import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

/**
 * Local stand-in for the Obsidian Community source scanner.
 * Use `npm run lint:obsidian` (--quiet) as an Error-only precheck before
 * triggering a remote preview scan. Remote still owns release/attestation checks.
 *
 * Note: the hosted scanner ignores per-plugin severity overrides; keep this
 * close to `obsidianmd.configs.recommended`.
 */
export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			'main.js',
			'esbuild.config.mjs',
			'scripts/**',
			'coverage/**',
			'node_modules/**',
			'src/__tests__/**',
		],
	},
]);
