import path from 'path'

const displayPath = p => path.relative(process.cwd(), p)

export { displayPath }
