import base from 'base-x';
import { ConnectKitButton, useModal } from 'connectkit';
import { create } from 'kubo-rpc-client';
import { useForm } from 'react-hook-form';
import { Address, encodePacked, keccak256, toBytes, toHex } from 'viem';
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useTransactionConfirmations,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import yaml from 'yaml';
import { z } from 'zod';
import { Editor } from '@/components/Editor';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { L2GNSABI } from '../abis/L2GNS';
import addresses from '../addresses.json';

const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

const CHAINS = ['arbitrum-one', 'arbitrum-sepolia'] as const;
const SUPPORTED_CHAIN = {
  'arbitrum-one': { chainId: 42161, contracts: addresses[42161] },
  'arbitrum-sepolia': {
    chainId: 421614,
    contracts: addresses[421614],
  },
} as const;

const getChainInfo = (chain: keyof typeof SUPPORTED_CHAIN) => {
  return SUPPORTED_CHAIN[chain];
};

const subgraphMetadataSchema = z.object({
  description: z.string().optional(),
  displayName: z.string(),
  image: z.string().transform(value => {
    return value.startsWith('ipfs://') ? value : `ipfs://${value}`;
  }),
  subgraphImage: z.string().url(),
  codeRepository: z.string().url().optional(),
  website: z.string().url().optional(),
  categories: z.array(z.string()).optional(),
  chain: z.enum(CHAINS),
});

const ipfsHexHash = (ipfsHash: string) => {
  const hash = base58.decode(ipfsHash).slice(2);
  const hex = Buffer.from(hash).toString('hex');
  return `0x${hex}` as const;
};

const subgraphMetadata = ({
  description,
  displayName,
  codeRepository,
  website,
  categories,
  image,
  subgraphImage,
}: z.infer<typeof subgraphMetadataSchema>) => {
  return {
    description,
    image,
    subgraphImage,
    displayName,
    name: displayName,
    codeRepository: codeRepository || null,
    website: website || null,
    categories: categories || null,
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
    // @ts-expect-error - we are throwing an error here
    throw Error(`Failed to upload file to IPFS: ${e?.message || e}`);
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

// Subset of the manifest schema that we care about
// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#13-top-level-api
const Manifest = z.object({
  specVersion: z
    .string()
    .describe('A Semver version indicating which version of this API is being used.'),
  description: z.string().describe("An optional description of the subgraph's purpose.").optional(),
  repository: z.string().describe('An optional link to where the subgraph lives.').optional(),
});

function DeploySubgraph({ deploymentId }: { deploymentId: string }) {
  const { writeContractAsync, isPending } = useWriteContract({});
  const { setOpen } = useModal();
  const { switchChainAsync, isPending: chainSwitchPending } = useSwitchChain();
  const { toast } = useToast();

  const { address, chainId } = useAccount();

  const { data: subgraphManifest } = useQuery({
    queryKey: ['subgraph-manifest', deploymentId],
    queryFn: async () => {
      const manifest = await readIpfsFile(deploymentId);
      const parsed = await Manifest.passthrough().parseAsync(yaml.parse(manifest));

      return {
        parsed,
        raw: manifest,
      };
    },
  });

  const { data } = useReadContract({
    abi: L2GNSABI,
    address: '0x3133948342F35b8699d8F94aeE064AbB76eDe965',
    functionName: 'nextAccountSeqID',
    args: ['0x6f5ccd3e078ba48291dfb491cce18f348f6f5c00'],
  });

  const form = useForm<z.infer<typeof subgraphMetadataSchema>>({
    resolver: zodResolver(subgraphMetadataSchema),
    defaultValues: {
      description: subgraphManifest?.parsed.description,
      image: 'ipfs://QmeFs3a4d7kQKuGbV2Ujb5B7ZN8Ph61W5gFfF2mKg2SBtB',
      subgraphImage:
        'https://api.thegraph.com/ipfs/api/v0/cat?arg=QmdSeSQ3APFjLktQY3aNVu3M5QXPfE9ZRK5LqgghRgB7L9',
      codeRepository: subgraphManifest?.parsed.repository,
      website: undefined,
      categories: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof subgraphMetadataSchema>) {
    const selectedChain = getChainInfo(values.chain);

    if (!address) {
      setOpen(true);
      return;
    }

    if (!chainId || chainId !== selectedChain.chainId) {
      await switchChainAsync({
        chainId: selectedChain.chainId,
      });
    }

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
            ...values,
          }),
        ),
      ),
    });

    const hash = await writeContractAsync({
      address: selectedChain.contracts.L2GNS.address as Address,
      abi: L2GNSABI,
      functionName: 'publishNewSubgraph',
      args: [DEPLOYMENT_ID, ipfsHexHash(versionMeta), ipfsHexHash(subgraphMeta)],
    });

    window.open(`https://sepolia.arbiscan.io/tx/${hash}`, '_blank');

    toast({
      description: 'You are all set! You can go back to the CLI and close this window',
    });
  }

  return (
    <div className="flex px-4 lg:px-6 h-auto py-2">
      <div className="w-1/2">
        <Form {...form}>
          <h1 className="text-2xl font-bold text-center mb-2">Metadata</h1>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subgraph Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codeRepository"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Code URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publish to</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the chain to publish subgraph to" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(SUPPORTED_CHAIN).map(([chainName, { chainId }]) => (
                        <SelectItem key={chainId} value={chainName}>
                          {chainName} (eip-{chainId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending || chainSwitchPending}
            >
              {chainSwitchPending ? 'Switching Chain...' : isPending ? 'Check Wallet...' : 'Deploy'}
            </Button>
          </form>
        </Form>
        {/* <form onSubmit={onSubmit}>
    

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
        </form> */}
      </div>

      <div className="w-1/2 h-[calc(100vh_-_8rem)]">
        <h1 className="text-2xl font-bold text-center mb-2">Manifest</h1>
        {subgraphManifest ? <Editor value={subgraphManifest.raw} /> : null}
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
