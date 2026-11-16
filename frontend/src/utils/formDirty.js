export function areFormValuesDirty(values, baseline) {
  const current = values ?? {}
  const start = baseline ?? {}
  const empty = (value) => value === undefined || value === null || value === ''
  return [...new Set([...Object.keys(current), ...Object.keys(start)])].some((name) => {
    const left = current[name]
    const right = start[name]
    return !(Object.is(left, right) || (empty(left) && empty(right)))
  })
}
