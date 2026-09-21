import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT) || 4173
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`)
    const resolvedPath = resolvePath(url.pathname)
    if (!resolvedPath.absolutePath) {
      res.statusCode = resolvedPath.statusCode
      res.end(resolvedPath.statusCode === 400 ? 'Bad Request' : 'Forbidden')
      return
    }
    let { absolutePath } = resolvedPath

    let info = await stat(absolutePath)
    if (info.isDirectory()) {
      absolutePath = path.join(absolutePath, 'index.html')
      info = await stat(absolutePath)
    }

    if (!info.isFile()) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    const data = await readFile(absolutePath)
    res.statusCode = 200
    res.setHeader('Content-Type', contentTypes[path.extname(absolutePath)] || 'application/octet-stream')
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
  console.log(`http://${HOST}:${PORT}/demo/`)
})
