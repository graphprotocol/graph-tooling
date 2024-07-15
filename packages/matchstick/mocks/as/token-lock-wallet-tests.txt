import { assert, test, newMockEvent, dataSourceMock, describe, beforeAll, afterAll, logStore, clearStore } from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, DataSourceContext, store, Value } from "@graphprotocol/graph-ts"

import { handleApproveTokenDestinations } from "../../src/token-lock-wallet"
import { ApproveTokenDestinations } from "../../generated/templates/GraphTokenLockWallet/GraphTokenLockWallet"
import { NameSignalTransaction, TokenLockWallet, GraphAccount, Subgraph } from "../../generated/schema"
import { mockGraphAccount, mockNameSignalTransaction } from "./utils"

describe("dataSourceMock", () => {
  beforeAll(() => {
    let addressString = "0xA16081F360e3847006dB660bae1c6d1b2e17eC2A"
    let address = Address.fromString(addressString)

    let wallet = new TokenLockWallet(address.toHexString())
    // The following values should be set, because they are required fields,
    // and since graph-cli 0.30.0 codegen does not generate default values for required fields anymore
    wallet.manager = Address.zero()
    wallet.initHash = Address.zero() as Bytes
    wallet.beneficiary = Address.zero()
    wallet.tokenDestinationsApproved = false
    wallet.token = Bytes.fromHexString("0xc944e90c64b2c07662a292be6244bdf05cda44a7") // GRT
    wallet.managedAmount = BigInt.fromI32(0)
    wallet.startTime = BigInt.fromI32(0)
    wallet.endTime = BigInt.fromI32(0)
    wallet.periods = BigInt.fromI32(0)
    wallet.releaseStartTime = BigInt.fromI32(0)
    wallet.vestingCliffTime = BigInt.fromI32(0)
    wallet.tokensReleased = BigInt.fromI32(0)
    wallet.tokensWithdrawn = BigInt.fromI32(0)
    wallet.tokensRevoked = BigInt.fromI32(0)
    wallet.blockNumberCreated = BigInt.fromI32(0)
    wallet.txHash = Address.zero() as Bytes

    wallet.save()

    let context = new DataSourceContext()
    context.set("contextVal", Value.fromI32(325))

    dataSourceMock.setReturnValues(addressString, "rinkeby", context)
  })

  afterAll(() => {
    dataSourceMock.resetValues()
  })

  test("Simple dataSource mocking example", () => {
    let addressString = "0xA16081F360e3847006dB660bae1c6d1b2e17eC2A"
    let address = Address.fromString(addressString)

    let event = changetype<ApproveTokenDestinations>(newMockEvent())
    let wallet = TokenLockWallet.load(address.toHexString())!

    assert.assertNull(wallet.tokenDestinationsApproved)

    handleApproveTokenDestinations(event)

    wallet = TokenLockWallet.load(address.toHexString())!

    assert.assertTrue(wallet.tokenDestinationsApproved)
    assert.bigIntEquals(wallet.tokensReleased, BigInt.fromI32(325))
  })
})

describe("@derivedFrom fields", () => {
  beforeAll(() => {
    mockGraphAccount("12")
    mockGraphAccount("1")
  })

  afterAll(() => {
    clearStore()
  })

  test("Derived fields example test", () => {
    let mainAccount = GraphAccount.load("12")!

    assert.assertNull(mainAccount.get("nameSignalTransactions"))
    assert.assertNull(mainAccount.get("operatorOf"))

    let operatedAccount = GraphAccount.load("1")!
    operatedAccount.operators = [mainAccount.id]
    operatedAccount.save()

    mockNameSignalTransaction("1234", mainAccount.id)
    mockNameSignalTransaction("2", mainAccount.id)

    mainAccount = GraphAccount.load("12")!

    assert.assertNotNull(mainAccount.get("nameSignalTransactions"))
    assert.assertNotNull(mainAccount.get("operatorOf"))
    assert.i32Equals(2, mainAccount.nameSignalTransactions.length)
    assert.stringEquals("1", mainAccount.operatorOf[0])

    mockNameSignalTransaction("2345", mainAccount.id)

    let nst = NameSignalTransaction.load("1234")!
    nst.signer = "11"
    nst.save()

    store.remove("NameSignalTransaction", "2")

    mainAccount = GraphAccount.load("12")!
    assert.i32Equals(1, mainAccount.nameSignalTransactions.length)
  })
})
