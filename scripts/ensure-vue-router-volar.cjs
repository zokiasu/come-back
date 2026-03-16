const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const nestedVueRouterDir = path.join(rootDir, 'node_modules', 'nuxt', 'node_modules', 'vue-router')
const rootVueRouterDir = path.join(rootDir, 'node_modules', 'vue-router')

if (!fs.existsSync(nestedVueRouterDir)) {
	process.exit(0)
}

try {
	const stat = fs.lstatSync(rootVueRouterDir)

	if (stat.isSymbolicLink()) {
		const resolvedTarget = fs.realpathSync(rootVueRouterDir)
		if (path.resolve(resolvedTarget) === path.resolve(nestedVueRouterDir)) {
			process.exit(0)
		}

		fs.unlinkSync(rootVueRouterDir)
	} else {
		process.exit(0)
	}
} catch (error) {
	if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') {
		throw error
	}
}

const linkType = process.platform === 'win32' ? 'junction' : 'dir'
fs.symlinkSync(nestedVueRouterDir, rootVueRouterDir, linkType)
