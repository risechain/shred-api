import { createClient, webSocket } from 'viem'

const client = createClient({
  transport: webSocket('wss://mainnet.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID'),
})

const unsubscribe = await client.transport.subscribe(
  {
    method: 'eth_subscribe',
    params: [
      'logs',
      {
        address: '0x6257c5f110900a8E02A7A480b097D44F96360d16',
      },
    ],
  },
  
)

