import { ERC20Context, ERC20Processor, TransferEvent } from '@sentio/sdk/lib/builtin/erc20'
import { X2y2Context, X2y2Processor } from './types/x2y2'
import { Gauge } from '@sentio/sdk'

const recordPerBlock = new Gauge('reward_per_block', { description: 'reward per block for x2y2' })

X2y2Processor.bind({ address: '0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1', startBlock: 14211735 }).onBlock(
  async function (_, ctx: X2y2Context) {
    const phase = (await ctx.contract.currentPhase()).toString()
    const reward = Number((await ctx.contract.rewardPerBlockForStaking()).toBigInt() / 10n ** 18n)

    recordPerBlock.record(ctx, reward, { phase })
    // ctx.meter.Gauge('reward_per_block').record(reward, { phase })
  }
)

export const filter = ERC20Processor.filters.Transfer(
  '0x0000000000000000000000000000000000000000',
  '0xb329e39ebefd16f40d38f07643652ce17ca5bac1'
)

ERC20Processor.bind({ address: '0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9', startBlock: 14201940 }).onEventTransfer(
  handleTransfer,
  filter // filter is an optional parameter
)

async function handleTransfer(event: TransferEvent, ctx: ERC20Context) {
  const val = Number(event.args.value.toBigInt() / 10n ** 18n)
  ctx.meter.Counter('token').add(val)
}
