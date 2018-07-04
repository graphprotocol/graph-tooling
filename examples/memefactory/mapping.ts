/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />
/// <reference path="./node_modules/the-graph-wasm/index.d.ts" />
/// <reference path="./types/Meme.types.ts" />
/// <reference path="./types/MemeRegistry.types.ts" />

export function handleRegistryEntryEvent(event: EthereumEvent): void {
  // Extract event arguments
  let registryEntryAddress = event.params[0].value.toAddress()
  let eventType = event.params[1].value.toString(false)

  if (eventType === 'constructed') {
    // Create an instance of the 'Meme' contract
    let memeContract = Meme.bind(registryEntryAddress, event.blockHash)

    // Obtain registry entry and meme data from the contract
    let registryEntryData = memeContract.loadRegistryEntry()
    let memeData = memeContract.loadMeme()

    // Create an entity to push into the database
    let meme = new Entity()
    meme.setAddress('regEntry_address', registryEntryAddress)
    meme.setU256('regEntry_version', registryEntryData.value0)

    let otherMeme = new Entity()
    meme.setU32('regEntry_status', registryEntryData.value1)

    // meme now has the regEntry_status set on it
    meme.merge([otherMeme])

    database.create('Meme', registryEntryAddress.toString(), meme)
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
