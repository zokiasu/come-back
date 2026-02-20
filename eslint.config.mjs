// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
	ignores: ['eslint.config.mjs'],
	rules: {
		// Vue rules
		'vue/multi-word-component-names': 'off',
		'vue/no-v-html': 'warn',
		'vue/require-default-prop': 'off',
		'vue/html-self-closing': 'off',

		// TypeScript rules - warn on any to encourage proper typing
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
				varsIgnorePattern: '^_|^YT$',
			},
		],

		// General rules
		'no-console': ['warn', { allow: ['error', 'warn'] }],
		'prefer-const': 'warn',
		'no-duplicate-imports': 'error',
	},
})
