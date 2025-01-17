import { Counter, Gauge } from '@sentio/sdk'
import { toBigDecimal } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { X2y2Processor } from './types/x2y2'

const rewardPerBlock = new Gauge('reward_per_block', {
  description: 'rewards for each block grouped by phase',
  unit: 'x2y2',
})
const token = new Counter('token')

X2y2Processor.bind({ address: '0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1' }).onBlock(async (_, ctx) => {
  const phase = (await ctx.contract.currentPhase()).toString()
  const reward = toBigDecimal(await ctx.contract.rewardPerBlockForStaking()).div(10 ** 18)
  rewardPerBlock.record(ctx, reward, { phase })
})

const filter = ERC20Processor.filters.Transfer(
  '0x0000000000000000000000000000000000000000',
  '0xb329e39ebefd16f40d38f07643652ce17ca5bac1'
)

ERC20Processor.bind({ address: '0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9' }).onEventTransfer(
  async (event, ctx) => {
    const val = toBigDecimal(event.args.value).div(10 ** 18)
    token.add(ctx, val)
  },
  filter // filter is an optional parameter
)
