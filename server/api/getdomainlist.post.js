export default defineEventHandler( async (event) => {

	const body = await readBody(event)

	try {
		const data = await $fetch(body.url)
		return data
	} catch(error) {
		return error
	}
	
})
