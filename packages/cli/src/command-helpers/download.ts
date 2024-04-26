import { createWriteStream } from 'fs';
import { http } from 'gluegun';

export async function downloadFile(fileUrl: string, outputLocationPath: string) {
  const writer = createWriteStream(outputLocationPath);
  const api = http.create({
    baseURL: fileUrl,
  });
  return api.get('', {}, { responseType: 'stream' }).then((response: any) => {
    response.data.pipe(writer);
    return Promise.resolve(outputLocationPath);
  });
}
