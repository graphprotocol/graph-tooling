import path from 'path';

const displayPath = (p: string) => path.relative(process.cwd(), p);

export { displayPath };
