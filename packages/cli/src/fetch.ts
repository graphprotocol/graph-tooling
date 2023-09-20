// eslint-disable-next-line no-restricted-imports
import { fetch } from "@whatwg-node/fetch";
import { version } from "../package.json";

export default function fetchWrapper(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) {
  return fetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      "User-Agent": `@graphprotocol/graph-cli@${version}`,
    },
  });
}
