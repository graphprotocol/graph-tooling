import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/deploy')({
  component: Page,
});

export function Page() {
  return <div className="min-h-screen flex justify-center items-center p-8">deploy page</div>;
}
