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
		dropdownMenu: {
			slots: {
				content:
					'bg-cb-secondary-950/90 backdrop-blur-md ring-cb-quinary-900/70',
				item: 'text-white data-highlighted:text-white data-highlighted:before:bg-cb-primary-900/30',
				itemLeadingIcon: 'text-cb-tertiary-400 group-data-highlighted:text-white',
			},
		},
		inputMenu: {
			slots: {
				content:
					'bg-cb-quaternary-950 text-white ring-cb-quinary-900/70',
				item: 'text-white data-highlighted:text-white',
				itemLabel: 'text-white',
				empty: 'text-cb-tertiary-400',
			},
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
