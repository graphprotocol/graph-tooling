import path from 'node:path';

const displayPath = (p: string) => path.relative(process.cwd(), p);

export { displayPath };
