import base from 'base-x';

const ipfsHexHash = ipfsHash => {
  const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
  const hash = base58.decode(ipfsHash).slice(2);
  const hex = Buffer.from(hash).toString('hex');
  return `0x${hex}`;
};

const ipfsHashDecoder = hexHash => {
  const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

  // Remove the '0x' prefix
  const hex = hexHash.slice(2);

  // Convert the hex string to a buffer
  const hash = Buffer.from(hex, 'hex');

  // Add the 'Qm' prefix back to the buffer
  const fullHash = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);

  // Encode the buffer to base58
  return base58.encode(fullHash);
};

// console.log(ipfsHashDecoder("0xe6b7e99aa75500af4e882234909c7bf3a5908094ad22a5e58a539ba3e1d5dd2b"))
