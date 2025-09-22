import * as fs from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import decompress from 'decompress';
import fetch from '../fetch.js';

// Add GitHub repository configuration via environment variables with defaults
const GRAPH_NODE_GITHUB_OWNER = process.env.GRAPH_NODE_GITHUB_OWNER || 'graphprotocol';
const GRAPH_NODE_GITHUB_REPO = process.env.GRAPH_NODE_GITHUB_REPO || 'graph-node';

function getPlatformBinaryName(): string {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'linux' && arch === 'x64') return 'gnd-linux-x86_64.gz';
  if (platform === 'linux' && arch === 'arm64') return 'gnd-linux-aarch64.gz';
  if (platform === 'darwin' && arch === 'x64') return 'gnd-macos-x86_64.gz';
  if (platform === 'darwin' && arch === 'arm64') return 'gnd-macos-aarch64.gz';
  if (platform === 'win32' && arch === 'x64') return 'gnd-windows-x86_64.exe.zip';

  throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

export async function getGlobalBinDir(): Promise<string> {
  const platform = os.platform();
  let binDir: string;

  if (platform === 'win32') {
    // Prefer %USERPROFILE%\gnd\bin
    binDir = path.join(process.env.USERPROFILE || os.homedir(), 'gnd', 'bin');
  } else {
    binDir = path.join(os.homedir(), '.local', 'bin');
  }

  await fs.promises.mkdir(binDir, { recursive: true });
  return binDir;
}

async function getLatestGithubRelease(owner: string, repo: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
  const data = await res.json();
  return data.tag_name;
}

export async function getLatestGraphNodeRelease(): Promise<string> {
  return getLatestGithubRelease(GRAPH_NODE_GITHUB_OWNER, GRAPH_NODE_GITHUB_REPO);
}

export async function downloadGraphNodeRelease(
  release: string,
  outputDir: string,
  onProgress?: (downloaded: number, total: number | null) => void,
): Promise<string> {
  const fileName = getPlatformBinaryName();

  try {
    return await downloadGithubRelease(
      GRAPH_NODE_GITHUB_OWNER,
      GRAPH_NODE_GITHUB_REPO,
      release,
      outputDir,
      fileName,
      onProgress,
    );
  } catch (e) {
    if (e === 404) {
      throw new Error(`Graph Node release ${release} does not exist, please check the release page for the correct release tag`);
    }

    throw new Error(`Failed to download: ${release}`);
  }
}

async function downloadGithubRelease(
  owner: string,
  repo: string,
  release: string,
  outputDir: string,
  fileName: string,
  onProgress?: (downloaded: number, total: number | null) => void,
): Promise<string> {
  const url = `https://github.com/${owner}/${repo}/releases/download/${release}/${fileName}`;
  return downloadFile(url, path.join(outputDir, fileName), onProgress);
}

export async function downloadFile(
  url: string,
  outputPath: string,
  onProgress?: (downloaded: number, total: number | null) => void,
): Promise<string> {
  return download(url, outputPath, onProgress);
}

export async function download(
  url: string,
  outputPath: string,
  onProgress?: (downloaded: number, total: number | null) => void,
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw res.status;
  }

  const totalLength = Number(res.headers.get('content-length')) || null;
  let downloaded = 0;

  const fileStream = fs.createWriteStream(outputPath);
  const nodeStream = Readable.from(res.body);

  nodeStream.on('data', chunk => {
    downloaded += chunk.length;
    onProgress?.(downloaded, totalLength);
  });

  nodeStream.pipe(fileStream);

  await new Promise<void>((resolve, reject) => {
    nodeStream.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  return outputPath;
}

export async function extractGz(gzPath: string, outputPath?: string): Promise<string> {
  const outPath = outputPath || path.join(path.dirname(gzPath), path.basename(gzPath, '.gz'));

  await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(outPath));

  return outPath;
}

export async function extractZipAndGetExe(zipPath: string, outputDir: string): Promise<string> {
  const files = await decompress(zipPath, outputDir);
  const exe = files.filter(file => file.path.endsWith('.exe'));

  if (exe.length !== 1) {
    throw new Error(`Expected 1 executable file in zip, got ${exe.length}`);
  }

  return path.join(outputDir, exe[0].path);
}

export async function moveFileToBinDir(srcPath: string, binDir?: string): Promise<string> {
  const targetDir = binDir || (await getGlobalBinDir());
  const platform = os.platform();
  const binaryName = platform === 'win32' ? 'gnd.exe' : 'gnd';
  const destPath = path.join(targetDir, binaryName);
  await fs.promises.rename(srcPath, destPath);
  return destPath;
}

export async function moveFile(srcPath: string, destPath: string): Promise<string> {
  await fs.promises.rename(srcPath, destPath);
  return destPath;
}
