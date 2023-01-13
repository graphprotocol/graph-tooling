import { print } from 'gluegun';
import jayson from 'jayson';

export function createJsonRpcClient(url: URL): jayson.Client | null {
  const params = {
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    // username may be empty
    auth: url.password ? `${url.username}:${url.password}` : undefined,
  };

  if (url.protocol === 'https:') {
    return jayson.Client.https(params);
  }
  if (url.protocol === 'http:') {
    return jayson.Client.http(params);
  }
  print.error(`Unsupported protocol: ${url.protocol.substring(0, url.protocol.length - 1)}`);
  print.error('The Graph Node URL must be of the following format: http(s)://host[:port]/[path]');
  return null;
}
