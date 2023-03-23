import { arweave, BigInt } from "@graphprotocol/graph-ts"
import { Block, Poa, Tag, Transaction } from "../generated/schema"

function savePoa(id: string, poa: arweave.ProofOfAccess): string {
  const p = new Poa(id);

  p.option = poa.option;
  p.chunk = poa.chunk;
  p.data_path = poa.dataPath;
  p.tx_path = poa.txPath;

  p.save();

  return id;
}

function saveTags(id: string, tags: arweave.Tag[]): string[] {
  for (let i = 0; i < tags.length; i++) {
    const rawTag = tags[i];
    const tag = new Tag(id);

    tag.name = rawTag.name;
    tag.value = rawTag.value;

    tag.save();
  }

  return new Array<string>(tags.length).fill(id);
}

export function handleBlock(block: arweave.Block): void {
  let hash = bytesToBase64(block.indepHash, true);
  let entity = new Block(hash);

  entity.height = BigInt.fromU64(block.height);
  entity.timestamp = BigInt.fromU64(block.timestamp);
  entity.indep_hash = block.indepHash;
  entity.nonce = block.nonce;
  entity.previous_block = block.previousBlock;
  entity.last_retarget = BigInt.fromU64(block.lastRetarget);
  entity.diff = block.diff;
  entity.hash = block.hash;
  entity.tx_root = block.txRoot;
  entity.txs = block.txs;
  entity.wallet_list = block.walletList;
  entity.reward_addr = block.rewardAddr;
  entity.tags = saveTags(hash, block.tags);
  entity.reward_pool = block.rewardPool;
  entity.weave_size = block.weaveSize;
  entity.block_size = block.blockSize;
  entity.cumulative_diff = block.cumulativeDiff;
  entity.hash_list_merkle = block.hashListMerkle;
  entity.poa = savePoa(hash, block.poa)

  entity.save()
}


export function handleTx(tb: arweave.TransactionWithBlockPtr): void {
  const tx = tb.tx;
  const entity = new Transaction(bytesToBase64(tx.id,true));

  entity.block = bytesToBase64(tb.block.indepHash, true);
  entity.tx_id = tx.id;
  entity.last_tx = tx.lastTx;
  entity.owner = tx.owner;
  entity.tags = saveTags(tx.id.toHexString(), tx.tags);
  entity.data = tx.data;
  entity.data_root = tx.dataRoot;
  entity.data_size = tx.dataSize;
  entity.target = tx.target;
  entity.quantity = tx.quantity;
  entity.signature = tx.signature;
  entity.reward = tx.reward;

  entity.save();
}

const base64Alphabet = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
	"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
	"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
	"n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
];

const base64UrlAlphabet = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
	"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
	"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
	"n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "_"
];

function bytesToBase64(bytes: Uint8Array, urlSafe: boolean): string {
	let alphabet = urlSafe? base64UrlAlphabet : base64Alphabet;

	let result = '', i: i32, l = bytes.length;
	for (i = 2; i < l; i += 3) {
		result += alphabet[bytes[i - 2] >> 2];
		result += alphabet[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += alphabet[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
		result += alphabet[bytes[i] & 0x3F];
	}
	if (i === l + 1) { // 1 octet yet to write
		result += alphabet[bytes[i - 2] >> 2];
		result += alphabet[(bytes[i - 2] & 0x03) << 4];
		if (!urlSafe) {
			result += "==";
		}
	}
	if (!urlSafe && i === l) { // 2 octets yet to write
		result += alphabet[bytes[i - 2] >> 2];
		result += alphabet[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += alphabet[(bytes[i - 1] & 0x0F) << 2];
		if (!urlSafe) {
			result += "=";
		}
	}
	return result;
}