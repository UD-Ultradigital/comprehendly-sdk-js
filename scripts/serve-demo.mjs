import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HOST = '127.0.0.1'
const envPort = process.env.PORT
const parsedPort = envPort === undefined ? Number.NaN : Number.parseInt(envPort, 10)
const PORT = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 ? parsedPort : 4173
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const realRepoRoot = await realpath(repoRoot)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
}

function resolvePath(urlPathname) {
  const mappedPath = urlPathname === '/' ? '/demo/index.html' : urlPathname
  let decodedPath
  try {
    decodedPath = decodeURIComponent(mappedPath)
  } catch {
    return { statusCode: 400 }
  }
  const normalizedPath = path.posix.normalize(decodedPath).replace(/^\/+/, '')
  const absolutePath = path.resolve(repoRoot, normalizedPath)
  if (absolutePath !== repoRoot && !absolutePath.startsWith(repoRoot + path.sep)) {
    return { statusCode: 403 }
  }
  return { absolutePath }
}

function isWithinRepoRoot(absolutePath) {
  return absolutePath === realRepoRoot || absolutePath.startsWith(realRepoRoot + path.sep)
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method || 'GET'
    const requestTarget = req.url || '/'

    if (requestTarget === '*') {
      if (method === 'OPTIONS') {
        res.statusCode = 204
        res.setHeader('Allow', 'GET, HEAD, OPTIONS')
        res.end()
      } else {
        res.statusCode = 400
        res.end('Bad Request')
      }
      return
    }

    if (!requestTarget.startsWith('/')) {
      res.statusCode = 400
      res.end('Bad Request')
      return
    }

    if (method !== 'GET' && method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      res.end('Method Not Allowed')
      return
    }

    const url = new URL(requestTarget, `http://${HOST}:${PORT}`)
    const resolvedPath = resolvePath(url.pathname)
    if (!resolvedPath.absolutePath) {
      res.statusCode = resolvedPath.statusCode
      res.end(resolvedPath.statusCode === 400 ? 'Bad Request' : 'Forbidden')
      return
    }
    let { absolutePath } = resolvedPath
    absolutePath = await realpath(absolutePath)
    if (!isWithinRepoRoot(absolutePath)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    let info = await stat(absolutePath)
    if (info.isDirectory()) {
      absolutePath = path.join(absolutePath, 'index.html')
      absolutePath = await realpath(absolutePath)
      if (!isWithinRepoRoot(absolutePath)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }
      info = await stat(absolutePath)
    }

    if (!info.isFile()) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', contentTypes[path.extname(absolutePath)] || 'application/octet-stream')
    res.setHeader('Content-Length', String(info.size))
    if (method === 'HEAD') {
      res.end()
      return
    }
    const data = await readFile(absolutePath)
    res.end(data)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.statusCode = 404
      res.end('Not Found')
      return
    }
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.listen(PORT, HOST, () => {
  const address = server.address()
  const boundPort = typeof address === 'object' && address ? address.port : PORT
  console.log(`http://${HOST}:${boundPort}/demo/`)
})
