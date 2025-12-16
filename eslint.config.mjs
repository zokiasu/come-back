// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
	rules: {
		// Vue rules
		'vue/multi-word-component-names': 'off',
		'vue/no-v-html': 'warn',
		'vue/require-default-prop': 'off',

		// TypeScript rules
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/no-unused-vars': 'warn',

		// General rules
		'no-console': ['warn', { allow: ['error'] }],
	},
})
