import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const port = Number(process.env.PORT) || 4173
const root = process.cwd()
const allowed = new Set(['demo', 'src'])

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

function getSafePathname(reqUrl) {
  const [rawPath = '/'] = String(reqUrl || '/').split('?')
  const normalizedRawPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const mappedPath = normalizedRawPath === '/' ? '/demo/' : normalizedRawPath
  let decoded
  try {
    decoded = decodeURIComponent(mappedPath)
  } catch {
    return null
  }
  if (decoded.split('/').includes('..')) return null
  const normalized = path.posix.normalize(decoded)
  if (normalized === '..' || normalized.startsWith('../')) return null
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function resolveAllowedPath(pathname) {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  if (!allowed.has(firstSegment)) return null
  const target = path.resolve(root, `.${pathname}`)
  const base = path.resolve(root, firstSegment)
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) return null
  return { target, base }
}

const server = createServer(async (req, res) => {
  try {
    const pathname = getSafePathname(req.url || '/')
    if (!pathname) {
      send(res, 400, 'Bad Request')
      return
    }
    const resolvedPath = resolveAllowedPath(pathname)
    if (!resolvedPath) {
      send(res, 404, 'Not Found')
      return
    }
    let filePath = resolvedPath.target
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) {
        send(res, 307, '', { Location: `${pathname}/` })
        return
      }
      const indexPath = path.join(filePath, 'index.html')
      try {
        await fs.access(indexPath)
      } catch {
        send(res, 404, 'Not Found')
        return
      }
      filePath = indexPath
    } else if (pathname.endsWith('/')) {
      send(res, 404, 'Not Found')
      return
    }
    const [realFilePath, realBasePath] = await Promise.all([
      fs.realpath(filePath),
      fs.realpath(resolvedPath.base)
    ])
    if (realFilePath !== realBasePath && !realFilePath.startsWith(`${realBasePath}${path.sep}`)) {
      send(res, 404, 'Not Found')
      return
    }
    const body = await fs.readFile(realFilePath)
    const ext = path.extname(filePath).toLowerCase()
    send(res, 200, body, {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    })
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      send(res, 404, 'Not Found')
      return
    }
    send(res, 500, 'Internal Server Error')
  }
})

server.listen(port, () => {
  console.log(`http://127.0.0.1:${port}/demo/`)
})
