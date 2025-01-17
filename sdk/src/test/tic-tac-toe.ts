import { SuiBindOptions } from '../bind-options'
import { SuiBaseProcessor } from '../sui-processor'

class TicTacToeProcessor extends SuiBaseProcessor {
  static bind(options: SuiBindOptions): TicTacToeProcessor {
    if (options && !options.name) {
      options.name = 'TicTacToe'
    }
    return new TicTacToeProcessor(options)
  }
}

TicTacToeProcessor.bind({
  startBlock: 0,
  address: '',
}).onTransaction((txn, ctx) => {
  if (txn.certificate.data.transactions && txn.certificate.data.transactions.length > 0) {
    if (txn.certificate.data.transactions[0].Call.package.objectId === '0xb8252513f0b9efaa3e260842c4b84d8ff933522d') {
      if (txn.effects.events) {
        txn.effects.events.forEach((event: { newObject: { recipient: { AddressOwner: any } } }) => {
          if (event.newObject) {
            const owner = event.newObject.recipient.AddressOwner
            if ((owner.toString() as string).includes('0x1c27')) {
              ctx.meter.Counter('win_count').add(1)
            }
          }
        })
      }
    }
  }
})
