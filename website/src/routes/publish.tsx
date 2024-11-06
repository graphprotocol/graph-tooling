import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/publish')({
  validateSearch: z.object({
    subgraphId: z.string().optional(),
    // Transforming string to enum here doesn't actually work
    network: z.string().optional(),
    id: z.string().optional(),
    apiKey: z.string().optional(),
  }),
});
