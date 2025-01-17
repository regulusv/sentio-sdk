// TODO move out of this package

import { expect } from 'chai'

import { HandlerType, ProcessInstructionsRequest } from '..'

import Long from 'long'
import { TextEncoder } from 'util'
import { TestProcessorServer } from './test-processor-server'
import { firstCounterValue } from './metric-utils'

describe('Test Solana Example', () => {
  const service = new TestProcessorServer(() => {
    require('./mirrorworld')
    require('./wormhole-token-bridge')
  })

  beforeAll(async () => {
    await service.start({ templateInstances: [] })
  })

  test('check configuration ', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs).length(3)
  })

  test('Check mirrorworld instruction dispatch', async () => {
    const request: ProcessInstructionsRequest = {
      instructions: [
        {
          instructionData: 'CACadoFwjNvan4GP8gh3Jtm1qdeoKX5j2SbSNEiB',
          slot: Long.fromNumber(0),
          programAccountId: 'F78NhTC9XmP1DKsCBRz5LGdQc4n4yFbj2dURiv7T9gGZ',
        },
      ],
    }
    const res = await service.processInstructions(request)
    expect(res.result?.counters).length(3)
    expect(res.result?.gauges).length(0)
    expect(firstCounterValue(res.result, 'deposit_pool_total_value')).equal(5000000000n)
  })

  test('Check wormhole token bridge instruction dispatch', async () => {
    const request: ProcessInstructionsRequest = {
      instructions: [
        {
          instructionData: '33G5T8yXAQWdH8FX7fTy1mBJ6e4dUKfQWbViSrT7qJjpS8UAA3ftEQx9sNzrkaJm56xtENhDsWf',
          slot: Long.fromNumber(0),
          programAccountId: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb',
        },
        {
          instructionData: '33G5T8yXAQWdH8FX7fTy1mBJ6e4dUKfQWbViSrT7qJjpS8UAA3ftEQx9sNzrkaJm56xtENhDsWf',
          slot: Long.fromNumber(1),
          programAccountId: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb',
        },
      ],
    }
    const res = await service.processInstructions(request)
    expect(res.result?.counters).length(2)
    expect(res.result?.gauges).length(0)
    expect(res.result?.counters[0].metadata?.blockNumber.toInt()).equal(0)
    expect(firstCounterValue(res.result, 'total_transfer_amount')).equal(1000000n)
    expect(res.result?.counters[0].runtimeInfo?.from).equals(HandlerType.INSTRUCTION)
  })

  test('Check SPLToken parsed instruction dispatch', async () => {
    const parsedIns = {
      info: {
        account: '2SDN4vEJdCdW3pGyhx2km9gB3LeHzMGLrG2j4uVNZfrx',
        amount: '12000000000000',
        mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
        mintAuthority: 'BCD75RNBHrJJpW4dXVagL5mPjzRLnVZq4YirJdjEYMV7',
      },
      type: 'mintTo',
    }
    const request: ProcessInstructionsRequest = {
      instructions: [
        {
          instructionData: '',
          slot: Long.fromNumber(0),
          programAccountId: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb',
          parsed: new TextEncoder().encode(JSON.stringify(parsedIns)),
        },
      ],
    }
    const res = await service.processInstructions(request)
    expect(res.result?.counters).length(1)
    expect(res.result?.gauges).length(0)
    expect(res.result?.counters[0].metadata?.blockNumber.toInt()).equal(0)
    expect(firstCounterValue(res.result, 'totalWeth_supply')).equal(12000000000000)
    expect(res.result?.counters[0].runtimeInfo?.from).equals(HandlerType.INSTRUCTION)
  })
})
