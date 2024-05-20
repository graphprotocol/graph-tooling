import base from 'base-x';
import { ConnectKitButton } from 'connectkit';
import { create } from 'kubo-rpc-client';
import { Address, encodePacked, keccak256, toBytes, toHex } from 'viem';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { z } from 'zod';
import { Editor } from '@/components/Editor';
import YamlEditor from '@focus-reactive/react-yaml';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { L2GNSABI } from '../abis/L2GNS';

const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

const ipfsHexHash = (ipfsHash: string) => {
  const hash = base58.decode(ipfsHash).slice(2);
  const hex = Buffer.from(hash).toString('hex');
  return `0x${hex}` as const;
};

const subgraphMetadata = ({
  description,
  displayName,
  name,
}: {
  description: string | null;
  displayName: string;
  name: string;
}) => {
  return {
    description,
    image: 'ipfs://QmeFs3a4d7kQKuGbV2Ujb5B7ZN8Ph61W5gFfF2mKg2SBtB',
    subgraphImage:
      'https://api.thegraph.com/ipfs/api/v0/cat?arg=QmdSeSQ3APFjLktQY3aNVu3M5QXPfE9ZRK5LqgghRgB7L9',
    displayName,
    name,
    codeRepository: null,
    website: null,
    categories: null,
  };
};

const ipfsClient = create({
  url: 'https://api.thegraph.com/ipfs/api/v0',
});

async function uploadFileToIpfs(file: { path: string; content: Buffer }) {
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
    throw Error(`Failed to upload file to IPFS: ${e.message}`);
  }
}

async function readIpfsFile(cid: string) {
  const file = ipfsClient.cat(cid);

  const chunks: Uint8Array[] = [];
  for await (const chunk of file) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

const convertSubgraphIdtoBase58 = (subgraphId: string) => {
  return base58.encode(toBytes(toHex(BigInt(subgraphId))));
};

const buildSubgraphId = ({
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

function DeploySubgraph({ deploymentId }: { deploymentId: string }) {
  const { data: hash, writeContract, isPending } = useWriteContract({});
  const { address, chainId } = useAccount();
  const { data: subgraphManifest } = useQuery({
    queryKey: ['subgraph-manifest', deploymentId],
    queryFn: () => readIpfsFile(deploymentId),
  });
  console.log(subgraphManifest);
  const { data } = useReadContract({
    abi: L2GNSABI,
    address: '0x3133948342F35b8699d8F94aeE064AbB76eDe965',
    functionName: 'nextAccountSeqID',
    args: ['0x6f5ccd3e078ba48291dfb491cce18f348f6f5c00'],
  });

  async function deploySubgraph() {
    const DEPLOYMENT_ID = ipfsHexHash(deploymentId);
    const versionMeta = await uploadFileToIpfs({
      path: '',
      content: Buffer.from(JSON.stringify({ label: '0.0.3', description: null })),
    });

    const subgraphMeta = await uploadFileToIpfs({
      path: '',
      content: Buffer.from(
        JSON.stringify(
          subgraphMetadata({
            description: 'A subgraph for the Graph Network',
            displayName: 'test Subgraph 1',
            name: 'graph-network-subgraph',
          }),
        ),
      ),
    });

    writeContract({
      address: '0x3133948342F35b8699d8F94aeE064AbB76eDe965',
      abi: L2GNSABI,
      functionName: 'publishNewSubgraph',
      args: [DEPLOYMENT_ID, ipfsHexHash(versionMeta), ipfsHexHash(subgraphMeta)],
    });
  }

  return (
    <div className="flex px-4 lg:px-6 h-auto py-2">
      <div className="w-1/2">
        <form
          onSubmit={async e => {
            e.preventDefault();
            await deploySubgraph();
          }}
        >
          <button disabled={isPending} type="submit">
            {isPending ? 'Confirming...' : 'Deploy'}
          </button>

          {hash ? <div>Transaction Hash: {hash}</div> : null}

          {data && address && chainId ? (
            <div>
              Next Account Seq ID: https://testnet.thegraph.com/explorer/subgraphs/
              {convertSubgraphIdtoBase58(
                buildSubgraphId({
                  account: address,
                  seqId: data - 1n,
                  chainId: chainId,
                }),
              )}
            </div>
          ) : null}
        </form>
      </div>
      <div className="w-1/2 h-[calc(100vh_-_8rem)]">
        <h1 className="text-2xl font-bold text-center mb-2">Subgraph Manifest</h1>
        {subgraphManifest ? <Editor value={subgraphManifest} /> : null}
      </div>
    </div>
  );
}

function Page() {
  const { id } = Route.useSearch();

  return (
    <div className="min-h-screen">
      <nav className="flex h-14 items-center border-b lg:h-[60px] justify-between  px-4 lg:px-6">
        <img src="/the-graph-logomark-light.png" alt="logo" className="h-8" />
        <ConnectKitButton />
      </nav>
      {id ? (
        <DeploySubgraph deploymentId={id} />
      ) : (
        <div className="flex justify-center items-center min-h-screen -mt-16">
          Unable to find the Deployment ID. Go back to CLI
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/deploy')({
  component: Page,
  validateSearch: z.object({ id: z.string() }),
});
