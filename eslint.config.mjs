// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
	rules: {
		// Vue rules
		'vue/multi-word-component-names': 'off',
		'vue/no-v-html': 'warn',
		'vue/require-default-prop': 'off',
		'vue/html-self-closing': 'off',

		// TypeScript rules - warn on any to encourage proper typing
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

		// General rules
		'no-console': ['warn', { allow: ['error', 'warn'] }],
		'prefer-const': 'warn',
		'no-duplicate-imports': 'error',
	},
})
