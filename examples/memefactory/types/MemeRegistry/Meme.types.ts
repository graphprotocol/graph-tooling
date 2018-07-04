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

  toMap(): TypedMap<string, Token> {
    let map = new TypedMap<string, Token>();
    map.set("value0", Token.fromU256(this.value0));
    map.set("value1", Token.fromAddress(this.value1));
    map.set("value2", Token.fromU256(this.value2));
    map.set("value3", Token.fromBytes(this.value3));
    map.set("value4", Token.fromU256(this.value4));
    map.set("value5", Token.fromU256(this.value5));
    map.set("value6", Token.fromU256(this.value6));
    map.set("value7", Token.fromU256(this.value7));
    map.set("value8", Token.fromU256(this.value8));
    map.set("value9", Token.fromU256(this.value9));
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

  toMap(): TypedMap<string, Token> {
    let map = new TypedMap<string, Token>();
    map.set("value0", Token.fromBytes(this.value0));
    map.set("value1", Token.fromU8(this.value1));
    map.set("value2", Token.fromU256(this.value2));
    map.set("value3", Token.fromU256(this.value3));
    map.set("value4", Token.fromU256(this.value4));
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

  toMap(): TypedMap<string, Token> {
    let map = new TypedMap<string, Token>();
    map.set("value0", Token.fromAddress(this.value0));
    map.set("value1", Token.fromU256(this.value1));
    map.set("value2", Token.fromU256(this.value2));
    map.set("value3", Token.fromBytes(this.value3));
    map.set("value4", Token.fromU256(this.value4));
    map.set("value5", Token.fromU256(this.value5));
    map.set("value6", Token.fromU256(this.value6));
    map.set("value7", Token.fromU256(this.value7));
    map.set("value8", Token.fromU256(this.value8));
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

  toMap(): TypedMap<string, Token> {
    let map = new TypedMap<string, Token>();
    map.set("value0", Token.fromU256(this.value0));
    map.set("value1", Token.fromU8(this.value1));
    map.set("value2", Token.fromAddress(this.value2));
    map.set("value3", Token.fromU256(this.value3));
    map.set("value4", Token.fromU256(this.value4));
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

  toMap(): TypedMap<string, Token> {
    let map = new TypedMap<string, Token>();
    map.set("value0", Token.fromBytes(this.value0));
    map.set("value1", Token.fromU256(this.value1));
    map.set("value2", Token.fromU256(this.value2));
    map.set("value3", Token.fromU256(this.value3));
    return map;
  }
}

class Meme extends SmartContract {
  static bind(address: Address, blockHash: H256): Meme {
    return new Meme("Meme", address, blockHash);
  }

  challengeDispensationKey(): Bytes {
    let __result = super.call("challengeDispensationKey", []);
    return __result[0].toBytes();
  }

  creator(): Address {
    let __result = super.call("creator", []);
    return __result[0].toAddress();
  }

  loadRegistryEntryChallenge(): Meme__loadRegistryEntryChallengeResult {
    let __result = super.call("loadRegistryEntryChallenge", []);
    return new Meme__loadRegistryEntryChallengeResult(
      __result[0].toU256(),
      __result[1].toAddress(),
      __result[2].toU256(),
      __result[3].toBytes(),
      __result[4].toU256(),
      __result[5].toU256(),
      __result[6].toU256(),
      __result[7].toU256(),
      __result[8].toU256(),
      __result[9].toU256()
    );
  }

  wasChallenged(): bool {
    let __result = super.call("wasChallenged", []);
    return __result[0].toBoolean();
  }

  depositKey(): Bytes {
    let __result = super.call("depositKey", []);
    return __result[0].toBytes();
  }

  voteReward(_voter: Address): U256 {
    let __result = super.call("voteReward", [Token.fromAddress(_voter)]);
    return __result[0].toU256();
  }

  totalSupply(): U256 {
    let __result = super.call("totalSupply", []);
    return __result[0].toU256();
  }

  status(): u8 {
    let __result = super.call("status", []);
    return __result[0].toU8();
  }

  tokenIdStart(): U256 {
    let __result = super.call("tokenIdStart", []);
    return __result[0].toU256();
  }

  isChallengePeriodActive(): bool {
    let __result = super.call("isChallengePeriodActive", []);
    return __result[0].toBoolean();
  }

  isChallengeRewardClaimed(): bool {
    let __result = super.call("isChallengeRewardClaimed", []);
    return __result[0].toBoolean();
  }

  challengeReward(): U256 {
    let __result = super.call("challengeReward", []);
    return __result[0].toU256();
  }

  districtConfig(): Address {
    let __result = super.call("districtConfig", []);
    return __result[0].toAddress();
  }

  isVoteRevealPeriodActive(): bool {
    let __result = super.call("isVoteRevealPeriodActive", []);
    return __result[0].toBoolean();
  }

  votedWinningVoteOption(_voter: Address): bool {
    let __result = super.call("votedWinningVoteOption", [
      Token.fromAddress(_voter)
    ]);
    return __result[0].toBoolean();
  }

  version(): U256 {
    let __result = super.call("version", []);
    return __result[0].toU256();
  }

  revealPeriodDurationKey(): Bytes {
    let __result = super.call("revealPeriodDurationKey", []);
    return __result[0].toBytes();
  }

  winningVoteOption(): u8 {
    let __result = super.call("winningVoteOption", []);
    return __result[0].toU8();
  }

  isWhitelisted(): bool {
    let __result = super.call("isWhitelisted", []);
    return __result[0].toBoolean();
  }

  loadVote(_voter: Address): Meme__loadVoteResult {
    let __result = super.call("loadVote", [Token.fromAddress(_voter)]);
    return new Meme__loadVoteResult(
      __result[0].toBytes(),
      __result[1].toU8(),
      __result[2].toU256(),
      __result[3].toU256(),
      __result[4].toU256()
    );
  }

  challengePeriodEnd(): U256 {
    let __result = super.call("challengePeriodEnd", []);
    return __result[0].toU256();
  }

  isVoteRewardClaimed(_voter: Address): bool {
    let __result = super.call("isVoteRewardClaimed", [
      Token.fromAddress(_voter)
    ]);
    return __result[0].toBoolean();
  }

  challengePeriodDurationKey(): Bytes {
    let __result = super.call("challengePeriodDurationKey", []);
    return __result[0].toBytes();
  }

  whitelistedOn(): U256 {
    let __result = super.call("whitelistedOn", []);
    return __result[0].toU256();
  }

  registryToken(): Address {
    let __result = super.call("registryToken", []);
    return __result[0].toAddress();
  }

  commitPeriodDurationKey(): Bytes {
    let __result = super.call("commitPeriodDurationKey", []);
    return __result[0].toBytes();
  }

  registry(): Address {
    let __result = super.call("registry", []);
    return __result[0].toAddress();
  }

  metaHash(): Bytes {
    let __result = super.call("metaHash", []);
    return __result[0].toBytes();
  }

  isWinningOptionVoteFor(): bool {
    let __result = super.call("isWinningOptionVoteFor", []);
    return __result[0].toBoolean();
  }

  isVoteRevealPeriodOver(): bool {
    let __result = super.call("isVoteRevealPeriodOver", []);
    return __result[0].toBoolean();
  }

  memeToken(): Address {
    let __result = super.call("memeToken", []);
    return __result[0].toAddress();
  }

  totalMinted(): U256 {
    let __result = super.call("totalMinted", []);
    return __result[0].toU256();
  }

  winningVotesAmount(): U256 {
    let __result = super.call("winningVotesAmount", []);
    return __result[0].toU256();
  }

  isBlacklisted(): bool {
    let __result = super.call("isBlacklisted", []);
    return __result[0].toBoolean();
  }

  isVoteRevealed(_voter: Address): bool {
    let __result = super.call("isVoteRevealed", [Token.fromAddress(_voter)]);
    return __result[0].toBoolean();
  }

  deposit(): U256 {
    let __result = super.call("deposit", []);
    return __result[0].toU256();
  }

  challenge(): Meme__challengeResult {
    let __result = super.call("challenge", []);
    return new Meme__challengeResult(
      __result[0].toAddress(),
      __result[1].toU256(),
      __result[2].toU256(),
      __result[3].toBytes(),
      __result[4].toU256(),
      __result[5].toU256(),
      __result[6].toU256(),
      __result[7].toU256(),
      __result[8].toU256()
    );
  }

  loadRegistryEntry(): Meme__loadRegistryEntryResult {
    let __result = super.call("loadRegistryEntry", []);
    return new Meme__loadRegistryEntryResult(
      __result[0].toU256(),
      __result[1].toU8(),
      __result[2].toAddress(),
      __result[3].toU256(),
      __result[4].toU256()
    );
  }

  isVoteCommitPeriodActive(): bool {
    let __result = super.call("isVoteCommitPeriodActive", []);
    return __result[0].toBoolean();
  }

  maxTotalSupplyKey(): Bytes {
    let __result = super.call("maxTotalSupplyKey", []);
    return __result[0].toBytes();
  }

  voteQuorumKey(): Bytes {
    let __result = super.call("voteQuorumKey", []);
    return __result[0].toBytes();
  }

  loadMeme(): Meme__loadMemeResult {
    let __result = super.call("loadMeme", []);
    return new Meme__loadMemeResult(
      __result[0].toBytes(),
      __result[1].toU256(),
      __result[2].toU256(),
      __result[3].toU256()
    );
  }
}
