import { useState } from 'react';
import { ConnectKitButton, useModal } from 'connectkit';
import { useForm } from 'react-hook-form';
import semver from 'semver';
import { Address } from 'viem';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import yaml from 'yaml';
import { z } from 'zod';
import { SubgraphImageDropZone } from '@/components/Dropzone';
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
import { useToast } from '@/components/ui/use-toast';
import { readIpfsFile, uploadFileToIpfs } from '@/lib/ipfs';
import { ipfsHexHash } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { L2GNSABI } from '../abis/L2GNS';
import addresses from '../addresses.json';

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

const publishToCopy = (chain: ReturnType<typeof getChainInfo>['chainId']) => {
  switch (chain) {
    case 42161:
      return 'The Graph Network';
    case 421614:
      return 'The Graph Testnet (not meant for production workload)';
  }
};

const subgraphMetadataSchema = z.object({
  description: z.string().optional(),
  displayName: z.string(),
  subgraphImage: z.string().url(),
  codeRepository: z.string().url().optional(),
  website: z.string().url().optional(),
  categories: z.array(z.string()).optional(),
  versionLabel: z.string().superRefine((value, ctx) => {
    if (!semver.valid(value)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Not a valid semver version. Example: 0.0.1',
      });
      return false;
    }

    return true;
  }),
  chain: z.enum(CHAINS),
});

const subgraphMetadata = ({
  description,
  displayName,
  codeRepository,
  website,
  categories,
  subgraphImage,
}: z.infer<typeof subgraphMetadataSchema>) => {
  return {
    description,
    image: (() => {
      const match = subgraphImage.match(/[?&]arg=([^&]+)/);

      const hash = match?.[1];

      if (!hash) {
        throw new Error('Invalid IPFS hash');
      }

      return `ipfs://${hash}`;
    })(),
    subgraphImage,
    displayName,
    name: displayName,
    codeRepository: codeRepository || null,
    website: website || null,
    categories: categories || null,
  };
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
  const [deployed, setDeployed] = useState(false);

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

  const form = useForm<z.infer<typeof subgraphMetadataSchema>>({
    resolver: zodResolver(subgraphMetadataSchema),
    mode: 'all',
    defaultValues: {
      description: subgraphManifest?.parsed.description,
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
      content: Buffer.from(JSON.stringify({ label: values.versionLabel, description: null })),
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
    setDeployed(true);
    toast({
      description: 'You are all set! You can go back to the CLI and close this window',
    });
  }

  const isDeployButtonDisabled =
    deployed || chainSwitchPending || isPending || !form.formState.isValid;

  const deployButtonCopy = (() => {
    if (deployed) return 'Deployed';
    if (chainSwitchPending) return 'Switching Chains...';
    if (isPending) return 'Check Wallet...';
    return 'Deploy';
  })();

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
                  <FormLabel>Display Name*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Name to display on the Graph Explorer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="versionLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version Label*</FormLabel>
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
              name="subgraphImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subgraph Image</FormLabel>
                  <FormControl>
                    <SubgraphImageDropZone {...field} />
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
                  <FormLabel>Publish to*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the network to deploy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(SUPPORTED_CHAIN).map(([chainName, { chainId }]) => (
                        <SelectItem key={chainId} value={chainName}>
                          {publishToCopy(chainId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full" disabled={isDeployButtonDisabled}>
              {deployButtonCopy}
            </Button>
          </form>
        </Form>
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

export const Route = createFileRoute('/publish')({
  component: Page,
  validateSearch: z.object({ id: z.string(), subgraph: z.string() }),
});
