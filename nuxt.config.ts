// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
  ssr: false,
  pages: true,
  modules: ["@nuxtjs/tailwindcss", "shadcn-nuxt", '@nuxtjs/color-mode'],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  colorMode: {
    classSuffix: ''
  },
  serverMiddleware: [
    // Your other server middleware and routes...
    { path: '/api/tldlist', handler: '~/server/api/tldlist.js' },
    { handler: '~/server/middleware/fetchData.js' },
  ],
  vite: {
    esbuild: {
      drop: ['debugger', 'console'],
      pure: ['console.log', 'console.error', 'console.warn', 'console.debug', 'console.trace'],
    },
  },
  // nitro: {
  //       esbuild: {
  //           options: {
  //               drop: ["console"],
  //           },
  //       },
  //   },
})