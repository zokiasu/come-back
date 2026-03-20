export default defineAppConfig({
	ui: {
		colors: {
			primary: 'cb-primary',
			secondary: 'cb-secondary',
			tertiary: 'cb-tertiary',
			quaternary: 'cb-quaternary',
			quinary: 'cb-quinary',
			neutral: 'cb-quaternary',
		},
		button: {
			slots: {
				base: 'cursor-pointer',
			},
			variants: {
				size: {
					md: {
						leadingIcon: 'size-4',
						trailingIcon: 'size-4',
					},
					lg: {
						leadingIcon: 'size-4',
						trailingIcon: 'size-4',
					},
					xl: {
						leadingIcon: 'size-5',
						trailingIcon: 'size-5',
					},
				},
			},
		},
	},
})
