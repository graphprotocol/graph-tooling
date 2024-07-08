import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/')({
  component: Page,
});

export function Page() {
  return (
    <div className="min-h-screen flex justify-center items-center p-8">
      <a href="https://thegraph.com" target="_blank">
        <img
          src="the-graph-logomark-light.png"
          className="h-24 p-6 hover:drop-shadow-[0_0_2em_#61dafbaa]"
          alt="The Graph logo"
        />
      </a>
    </div>
  );
}
