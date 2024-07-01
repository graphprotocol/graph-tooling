import { createWriteStream } from 'fs';
import fetchWrapper from '../fetch';

export async function downloadFile(fileUrl: string, outputLocationPath: string) {
  const writer = createWriteStream(outputLocationPath);
  const stream = new WritableStream({
    write(chunk) {
      writer.write(chunk);
    },
  });
  const url = fileUrl.startsWith('https://') ? fileUrl : `https://${fileUrl}`;
  return fetchWrapper(url, {
    method: 'GET',
  })
    .then(response => {
      if (!response.body) {
        return Promise.reject('No file found');
      }
      return response.body.pipeTo(stream);
    })
    .then(() => {
      return Promise.resolve(outputLocationPath);
    });
}
