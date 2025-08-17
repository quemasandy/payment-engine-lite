import { ResponseShape } from '@domain/core'

export const shapeResponse = (obj: any, shape: ResponseShape): any => {
  const omit = new Set(shape.omit || [])
  const rename = shape.rename || {}
  const out: any = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (omit.has(k)) return
    const nk = rename[k] || k
    out[nk] = v
  })
  return out
}
