// validator that checks if spkg exists or is valid url

import path from 'path';
import { filesystem } from 'gluegun';

export const isSpkgUrl = (value: string) => {
  return value.startsWith('https://spkg.io/streamingfast');
};

export const validateSpkg = (value: string) => {
  return filesystem.exists(value) || isSpkgUrl(value);
};

export const getSpkgFilePath = (spkgUrl: string, directory: string) => {
  const spkgFileName = spkgUrl.split('/').pop();
  if (!spkgFileName) throw new Error('Invalid spkg url');
  return path.join(directory, spkgFileName);
};
