import { create } from 'kubo-rpc-client';

const ipfsClient = create({
  url: 'https://api.thegraph.com/ipfs/api/v0',
});

export async function uploadFileToIpfs(file: { path: string; content: Buffer }) {
  try {
    const files = ipfsClient.addAll([file]);

    // We get back async iterable
    const filesIterator = files[Symbol.asyncIterator]();
    // We only care about the first item, since that is the file, rest could be directories
    const { value } = await filesIterator.next();

    // we grab the file and pin it
    const uploadedFile = value as Awaited<ReturnType<typeof ipfsClient.add>>;
    await ipfsClient.pin.add(uploadedFile.cid);

    return uploadedFile.cid.toString();
  } catch (e) {
    // @ts-expect-error - we are throwing an error here
    throw Error(`Failed to upload file to IPFS: ${e?.message || e}`);
  }
}

export async function readIpfsFile(cid: string) {
  const file = ipfsClient.cat(cid);

  const chunks: Uint8Array[] = [];
  for await (const chunk of file) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}
