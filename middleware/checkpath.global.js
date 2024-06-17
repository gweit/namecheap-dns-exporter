export default defineNuxtRouteMiddleware( async (to, from) => {
  // console.warn('check path')
  
  // console.log(to)

  if (to.path !== '/') {
    return navigateTo('/')
  }

})
