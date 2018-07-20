class Meme__loadRegistryEntryChallengeResult {
  value0: U256;
  value1: Address;
  value2: U256;
  value3: Bytes;
  value4: U256;
  value5: U256;
  value6: U256;
  value7: U256;
  value8: U256;
  value9: U256;

  constructor(
    value0: U256,
    value1: Address,
    value2: U256,
    value3: Bytes,
    value4: U256,
    value5: U256,
    value6: U256,
    value7: U256,
    value8: U256,
    value9: U256
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
    this.value5 = value5;
    this.value6 = value6;
    this.value7 = value7;
    this.value8 = value8;
    this.value9 = value9;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromAddress(this.value1));
    map.set("value2", EthereumValue.fromU256(this.value2));
    map.set("value3", EthereumValue.fromBytes(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    map.set("value5", EthereumValue.fromU256(this.value5));
    map.set("value6", EthereumValue.fromU256(this.value6));
    map.set("value7", EthereumValue.fromU256(this.value7));
    map.set("value8", EthereumValue.fromU256(this.value8));
    map.set("value9", EthereumValue.fromU256(this.value9));
    return map;
  }
}

class Meme__loadVoteResult {
  value0: Bytes;
  value1: u8;
  value2: U256;
  value3: U256;
  value4: U256;

  constructor(
    value0: Bytes,
    value1: u8,
    value2: U256,
    value3: U256,
    value4: U256
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromBytes(this.value0));
    map.set("value1", EthereumValue.fromU8(this.value1));
    map.set("value2", EthereumValue.fromU256(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    return map;
  }
}

class Meme__challengeResult {
  value0: Address;
  value1: U256;
  value2: U256;
  value3: Bytes;
  value4: U256;
  value5: U256;
  value6: U256;
  value7: U256;
  value8: U256;

  constructor(
    value0: Address,
    value1: U256,
    value2: U256,
    value3: Bytes,
    value4: U256,
    value5: U256,
    value6: U256,
    value7: U256,
    value8: U256
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
    this.value5 = value5;
    this.value6 = value6;
    this.value7 = value7;
    this.value8 = value8;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromAddress(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    map.set("value2", EthereumValue.fromU256(this.value2));
    map.set("value3", EthereumValue.fromBytes(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    map.set("value5", EthereumValue.fromU256(this.value5));
    map.set("value6", EthereumValue.fromU256(this.value6));
    map.set("value7", EthereumValue.fromU256(this.value7));
    map.set("value8", EthereumValue.fromU256(this.value8));
    return map;
  }
}

class Meme__loadRegistryEntryResult {
  value0: U256;
  value1: u8;
  value2: Address;
  value3: U256;
  value4: U256;

  constructor(
    value0: U256,
    value1: u8,
    value2: Address,
    value3: U256,
    value4: U256
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU8(this.value1));
    map.set("value2", EthereumValue.fromAddress(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    return map;
  }
}

class Meme__loadMemeResult {
  value0: Bytes;
  value1: U256;
  value2: U256;
  value3: U256;

  constructor(value0: Bytes, value1: U256, value2: U256, value3: U256) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromBytes(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    map.set("value2", EthereumValue.fromU256(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    return map;
  }
}

class Meme extends SmartContract {
  static bind(address: Address, blockHash: H256): Meme {
    return new Meme("Meme", address, blockHash);
  }

  challengeDispensationKey(): Bytes {
    let result = super.call("challengeDispensationKey", []);
    return result[0].toBytes();
  }

  creator(): Address {
    let result = super.call("creator", []);
    return result[0].toAddress();
  }

  loadRegistryEntryChallenge(): Meme__loadRegistryEntryChallengeResult {
    let result = super.call("loadRegistryEntryChallenge", []);
    return new Meme__loadRegistryEntryChallengeResult(
      result[0].toU256(),
      result[1].toAddress(),
      result[2].toU256(),
      result[3].toBytes(),
      result[4].toU256(),
      result[5].toU256(),
      result[6].toU256(),
      result[7].toU256(),
      result[8].toU256(),
      result[9].toU256()
    );
  }

  wasChallenged(): boolean {
    let result = super.call("wasChallenged", []);
    return result[0].toBoolean();
  }

  depositKey(): Bytes {
    let result = super.call("depositKey", []);
    return result[0].toBytes();
  }

  voteReward(_voter: Address): U256 {
    let result = super.call("voteReward", [EthereumValue.fromAddress(_voter)]);
    return result[0].toU256();
  }

  totalSupply(): U256 {
    let result = super.call("totalSupply", []);
    return result[0].toU256();
  }

  status(): u8 {
    let result = super.call("status", []);
    return result[0].toU8();
  }

  tokenIdStart(): U256 {
    let result = super.call("tokenIdStart", []);
    return result[0].toU256();
  }

  isChallengePeriodActive(): boolean {
    let result = super.call("isChallengePeriodActive", []);
    return result[0].toBoolean();
  }

  isChallengeRewardClaimed(): boolean {
    let result = super.call("isChallengeRewardClaimed", []);
    return result[0].toBoolean();
  }

  challengeReward(): U256 {
    let result = super.call("challengeReward", []);
    return result[0].toU256();
  }

  districtConfig(): Address {
    let result = super.call("districtConfig", []);
    return result[0].toAddress();
  }

  isVoteRevealPeriodActive(): boolean {
    let result = super.call("isVoteRevealPeriodActive", []);
    return result[0].toBoolean();
  }

  votedWinningVoteOption(_voter: Address): boolean {
    let result = super.call("votedWinningVoteOption", [
      EthereumValue.fromAddress(_voter)
    ]);
    return result[0].toBoolean();
  }

  version(): U256 {
    let result = super.call("version", []);
    return result[0].toU256();
  }

  revealPeriodDurationKey(): Bytes {
    let result = super.call("revealPeriodDurationKey", []);
    return result[0].toBytes();
  }

  winningVoteOption(): u8 {
    let result = super.call("winningVoteOption", []);
    return result[0].toU8();
  }

  isWhitelisted(): boolean {
    let result = super.call("isWhitelisted", []);
    return result[0].toBoolean();
  }

  loadVote(_voter: Address): Meme__loadVoteResult {
    let result = super.call("loadVote", [EthereumValue.fromAddress(_voter)]);
    return new Meme__loadVoteResult(
      result[0].toBytes(),
      result[1].toU8(),
      result[2].toU256(),
      result[3].toU256(),
      result[4].toU256()
    );
  }

  challengePeriodEnd(): U256 {
    let result = super.call("challengePeriodEnd", []);
    return result[0].toU256();
  }

  isVoteRewardClaimed(_voter: Address): boolean {
    let result = super.call("isVoteRewardClaimed", [
      EthereumValue.fromAddress(_voter)
    ]);
    return result[0].toBoolean();
  }

  challengePeriodDurationKey(): Bytes {
    let result = super.call("challengePeriodDurationKey", []);
    return result[0].toBytes();
  }

  whitelistedOn(): U256 {
    let result = super.call("whitelistedOn", []);
    return result[0].toU256();
  }

  registryToken(): Address {
    let result = super.call("registryToken", []);
    return result[0].toAddress();
  }

  commitPeriodDurationKey(): Bytes {
    let result = super.call("commitPeriodDurationKey", []);
    return result[0].toBytes();
  }

  registry(): Address {
    let result = super.call("registry", []);
    return result[0].toAddress();
  }

  metaHash(): Bytes {
    let result = super.call("metaHash", []);
    return result[0].toBytes();
  }

  isWinningOptionVoteFor(): boolean {
    let result = super.call("isWinningOptionVoteFor", []);
    return result[0].toBoolean();
  }

  isVoteRevealPeriodOver(): boolean {
    let result = super.call("isVoteRevealPeriodOver", []);
    return result[0].toBoolean();
  }

  memeToken(): Address {
    let result = super.call("memeToken", []);
    return result[0].toAddress();
  }

  totalMinted(): U256 {
    let result = super.call("totalMinted", []);
    return result[0].toU256();
  }

  winningVotesAmount(): U256 {
    let result = super.call("winningVotesAmount", []);
    return result[0].toU256();
  }

  isBlacklisted(): boolean {
    let result = super.call("isBlacklisted", []);
    return result[0].toBoolean();
  }

  isVoteRevealed(_voter: Address): boolean {
    let result = super.call("isVoteRevealed", [
      EthereumValue.fromAddress(_voter)
    ]);
    return result[0].toBoolean();
  }

  deposit(): U256 {
    let result = super.call("deposit", []);
    return result[0].toU256();
  }

  challenge(): Meme__challengeResult {
    let result = super.call("challenge", []);
    return new Meme__challengeResult(
      result[0].toAddress(),
      result[1].toU256(),
      result[2].toU256(),
      result[3].toBytes(),
      result[4].toU256(),
      result[5].toU256(),
      result[6].toU256(),
      result[7].toU256(),
      result[8].toU256()
    );
  }

  loadRegistryEntry(): Meme__loadRegistryEntryResult {
    let result = super.call("loadRegistryEntry", []);
    return new Meme__loadRegistryEntryResult(
      result[0].toU256(),
      result[1].toU8(),
      result[2].toAddress(),
      result[3].toU256(),
      result[4].toU256()
    );
  }

  isVoteCommitPeriodActive(): boolean {
    let result = super.call("isVoteCommitPeriodActive", []);
    return result[0].toBoolean();
  }

  maxTotalSupplyKey(): Bytes {
    let result = super.call("maxTotalSupplyKey", []);
    return result[0].toBytes();
  }

  voteQuorumKey(): Bytes {
    let result = super.call("voteQuorumKey", []);
    return result[0].toBytes();
  }

  loadMeme(): Meme__loadMemeResult {
    let result = super.call("loadMeme", []);
    return new Meme__loadMemeResult(
      result[0].toBytes(),
      result[1].toU256(),
      result[2].toU256(),
      result[3].toU256()
    );
  }
}
