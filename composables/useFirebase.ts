import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { useUserStore } from '@/stores/user'

export const signUpWithEAndP = async (email: string, password: string) => {
	const { $auth } = useNuxtApp()

	const credentials = await createUserWithEmailAndPassword($auth, email, password).catch(
		(error) => {
			const errorCode = error.code
			const errorMessage = error.message
			console.log(error)
		},
	)
	return credentials
}

export const signInWithEAndP = async (email: string, password: string) => {
	const { $auth } = useNuxtApp()

	const credentials = await signInWithEmailAndPassword($auth, email, password).catch(
		(error) => {
			const errorCode = error.code
			const errorMessage = error.message
			console.log(error)
		},
	)
	return credentials
}

export const signOutApp = async () => {
	const { $auth } = useNuxtApp()
	const { setUserData, setIsAdmin } = useUserStore()
	setUserData(null)
	setIsAdmin(false)
	const result = await $auth.signOut()
	return result
}
