export function logRequest(route: string, method: string, meta: any = {}) {
  try {
    // Keep logs concise but informative
    console.info(`[API] ${method} ${route} request`, safeMeta(meta))
  } catch {}
}

export function logResponse(route: string, method: string, status: number, meta: any = {}) {
  try {
    console.info(`[API] ${method} ${route} response ${status}`, safeMeta(meta))
  } catch {}
}

export function logError(route: string, method: string, error: any, meta: any = {}) {
  try {
    console.error(`[API] ${method} ${route} error`, {
      message: error?.message ?? String(error),
      ...safeMeta(meta),
    })
  } catch {}
}

function safeMeta(meta: any) {
  // Avoid logging huge buffers/blobs or circular refs
  const replacer = (_key: string, value: any) => {
    if (value instanceof Buffer) return `<Buffer ${value.length} bytes>`
    if (typeof value === "object" && value !== null) {
      try { JSON.stringify(value); } catch { return `<Unserializable>` }
    }
    return value
  }
  try {
    return JSON.parse(JSON.stringify(meta, replacer))
  } catch {
    return meta
  }
}