/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />
/// <reference path="./node_modules/the-graph-wasm/index.d.ts" />

// This class is auto-generated at compile time
declare class MemeContract {
  constructor(address: Address)
  loadRegistryEntry(): Array<Value>
  loadMeme(): Array<Value>
}

export function handleRegistryEntryEvent(
  ctx: EventHandlerContext,
  event: EthereumEvent
): void {
  // Extract event arguments
  let registryEntryAddress = event.params[0].value.toAddress()
  let eventType = event.params[1].value.toString()

  if (eventType === 'constructed') {
    let memeContract = new MemeContract(registryEntryAddress)
    let registryEntryData = memeContract.loadRegistryEntry().pop()
    let memeData = memeContract.loadMeme().pop()

    if (registryEntryData === null) {
      throw new Error("Failed to handle 'constructed' event: No entry data found")
    } else if (memeData === null) {
      throw new Error("Failed to handle 'constructed' event: No meme data found")
    } else {
      let version = Value.fromString(
        registryEntryData
          .toMap()
          .get('version')
          .toString()
      )

      let meme = new Entity()
      meme.set('regEntry_address', Value.fromAddress(registryEntryAddress))
      meme.set('regEntry_version', version)

      ctx.db.add('Meme', meme)
    }
  } else if (eventType === 'challengeCreated') {
    return
  } else if (eventType === 'voteCommitted') {
    return
  } else if (eventType === 'voteRevealed') {
    return
  } else if (eventType === 'challengeRewardClaimed') {
    return
  } else if (eventType === 'depositTransferred') {
    return
  } else if (eventType === 'minted') {
    return
  } else if (eventType === 'changeApplied') {
    return
  }
}
