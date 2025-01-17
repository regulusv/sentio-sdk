// TODO move out of this package

import { expect } from 'chai'

import { HandlerType } from '..'

import { TestProcessorServer } from './test-processor-server'
import { firstCounterValue, firstGaugeValue } from './metric-utils'
import { BigNumber } from 'ethers'
import { mockApprovalLog, mockTransferLog } from '../builtin/erc20/test-utils'
import { Trace } from '../trace'

describe('Test Basic Examples', () => {
  const service = new TestProcessorServer(() => require('./erc20'))

  beforeAll(async () => {
    await service.start()
  })

  test('check configuration', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs).length(5)

    // check auto rename
    expect(config.contractConfigs?.[2].contract?.name).equals('ERC20')
    expect(config.contractConfigs?.[3].contract?.name).equals('ERC20_1')
    // same as above because only differ in parameters
    expect(config.contractConfigs?.[4].contract?.name).equals('ERC20_1')
  })

  test('Check block dispatch', async () => {
    const res = (await service.testBlock(blockData)).result
    expect(res?.counters).length(0)
    expect(res?.gauges).length(1)
    expect(firstGaugeValue(res, 'g1')).equals(10n)

    const gauge = res?.gauges?.[0]
    expect(gauge?.metadata?.blockNumber?.toString()).equals('14373295')
    expect(gauge?.runtimeInfo?.from).equals(HandlerType.BLOCK)

    const res2 = (await service.testBlock(blockData, 56)).result
    expect(res2?.counters).length(0)
    expect(res2?.gauges).length(1)
    expect(firstGaugeValue(res2, 'g2')).equals(20n)
  })

  test('Check log dispatch', async () => {
    const logData = mockTransferLog('0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9', {
      from: '0x0000000000000000000000000000000000000000',
      to: '0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1',
      value: BigNumber.from('0x9a71db64810aaa0000'),
    })

    let res = await service.testLog(logData)

    const counters = res.result?.counters
    expect(counters).length(1)
    expect(firstCounterValue(res.result, 'c1')).equals(1n)

    expect(counters?.[0].metadata?.chainId).equals('1')
    expect(counters?.[0].runtimeInfo?.from).equals(HandlerType.LOG)
    expect(res.configUpdated).equals(true)

    const logData2 = Object.assign({}, logData)
    logData2.address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    res = await service.testLog(logData2, 56)

    expect(firstCounterValue(res.result, 'c2')).equals(2n)
    expect(res.result?.counters[0].metadata?.chainId).equals('56')

    expect(res.result?.gauges).length(0)

    const config = await service.getConfig({})
    expect(config.contractConfigs).length(6) //config increased
    expect(config.contractConfigs?.[5].contract?.name).equals('dynamic')

    // repeat trigger won't bind again
    await service.testLogs([logData])
    const config2 = await service.getConfig({})
    expect(config).deep.equals(config2)
  })

  test('Check log exception', async () => {
    const logData = mockApprovalLog('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', {
      owner: '0x0000000000000000000000000000000000000000',
      spender: '0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1',
      value: BigNumber.from('1111'),
    })

    try {
      await service.testLog(logData, 56)
    } catch (e) {
      expect(e.message.indexOf('sdk/src/test/erc20.ts') != -1).eq(true)
    }
  })

  const blockData = {
    hash: '0x2b9b7cce1f17f3b7e1f3c2472cc806a07bee3f0baca07d021350950d81d73a42',
    number: 14373295,
    timestamp: 1647106437,
    extraData: '0xe4b883e5bda9e7a59ee4bb99e9b1bc493421',
  }

  test('Check trace dispatch', async () => {
    const res = (await service.testTrace(traceData)).result
    expect(res?.counters).length(1)
  })

  const traceData: Trace = {
    action: {
      from: '0x80009ff8154bd5653c6dda2fa5f5053e5a5c1a91',
      callType: 'call',
      gas: 0xbb0a,
      input:
        '0x095ea7b30000000000000000000000003eabf546fff0a41edaaf5b667333a846285713180000000000000000000000000000000000000000000000000000002a03956d85',
      to: '0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9',
      value: 0x0,
    },
    blockHash: '0xb1fe1fefca4063ab9cc06a10356a6dd397b8c3dd38e21470e107a711ad559c13',
    blockNumber: 15548801,
    result: {
      gasUsed: 0x95df,
      output: '0x0000000000000000000000000000000000000000000000000000000000000001',
    },
    subtraces: 1,
    traceAddress: [],
    transactionHash: '0xc05c37b34e13380d0b7e0475b27a0c77fda826f82c603f9c45922e952d63b7a5',
    transactionPosition: 69,
    type: 'call',
  }
})
