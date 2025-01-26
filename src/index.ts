import { fromHono } from 'chanfana'
import { Hono } from 'hono'
import { dbMiddleware, limitMiddleware } from './middlewares'
import { FileCreate, FileFetch, FileShareCodeFetch, FileChunkCreate } from './files'

import { scheduled } from './scheduled'

// Start a Hono app
const app = new Hono<{
  Bindings: Env
}>()

// DB service
app.use('/api/*', dbMiddleware)
app.use('/api/files/*', dbMiddleware)
app.use('/api/files', limitMiddleware)

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: '/doc',
})

openapi.put('/api/files', FileCreate)
openapi.put('/api/files/chunk', FileChunkCreate)
openapi.get('/api/files/:id', FileFetch)
openapi.get('/api/files/share/:code', FileShareCodeFetch)

app.all(
  '/api/*',
  async () =>
    new Response('Method Not Allowed', {
      status: 405,
    }),
)

// Web
app.get('/*', async (c) => {
  if (c.env.ENVIRONMENT === 'dev') {
    const url = new URL(c.req.raw.url)
    url.port = c.env.SHARE_PORT
    return fetch(new Request(url, c.req.raw))
  }

  const response = await c.env.ASSETS.fetch(c.req.raw)
  
  // 只處理 HTML 回應
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('text/html')) {
    let text = await response.text()
    
    // 替換版本號和部署時間
    text = text.replace('__VERSION__', c.env.VERSION || '開發版')
    text = text.replace('__DEPLOY_TIME__', c.env.DEPLOY_TIME || new Date().toISOString())
    
    return new Response(text, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    })
  }
  
  return response
})

// Export the Hono app
export default {
  fetch: app.fetch,
  scheduled,
}
