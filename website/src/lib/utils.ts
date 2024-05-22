import base from 'base-x';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Address, encodePacked, keccak256, toBytes, toHex } from 'viem';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

export const ipfsHexHash = (ipfsHash: string) => {
  const hash = base58.decode(ipfsHash).slice(2);
  const hex = Buffer.from(hash).toString('hex');
  return `0x${hex}` as const;
};

export const convertSubgraphIdtoBase58 = (subgraphId: string) => {
  return base58.encode(toBytes(toHex(BigInt(subgraphId))));
};

export const buildSubgraphId = ({
  chainId,
  account,
  seqId,
}: {
  account: Address;
  seqId: bigint;
  chainId?: number;
}) => {
  if (chainId) {
    return BigInt(
      keccak256(encodePacked(['address', 'uint256', 'uint256'], [account, seqId, BigInt(chainId)])),
    ).toString();
  }

  return BigInt(keccak256(encodePacked(['address', 'uint256'], [account, seqId]))).toString();
};
