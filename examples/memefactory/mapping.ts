/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />
/// <reference path="./node_modules/the-graph-wasm/index.d.ts" />
/// <reference path="./types/Meme.types.ts" />
/// <reference path="./types/MemeRegistry.types.ts" />

export function handleRegistryEntryEvent(
  ctx: EventHandlerContext,
  event: EthereumEvent
): void {
  // Extract event arguments
  let registryEntryAddress = event.params[0].value.toAddress()
  let eventType = event.params[1].value.toString()

  if (eventType === 'constructed') {
    // Create an instance of the 'Meme' contract
    let memeContract = new Meme(registryEntryAddress)

    // Obtain registry entry and meme data from the contract
    let registryEntryData = memeContract.loadRegistryEntry()
    let memeData = memeContract.loadMeme()

    // Create an entity to push into the database
    let meme = new Entity()
    meme.set('regEntry_address', Value.fromAddress(registryEntryAddress))
    meme.set('regEntry_version', Value.fromU256(registryEntryData.value0))

    ctx.db.add('Meme', meme)
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
