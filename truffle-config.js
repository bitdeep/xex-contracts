const HDWalletProvider = require('@truffle/hdwallet-provider')
const dotenv = require("dotenv")

dotenv.config()
const liveNetworkPK = process.env.LIVE_PK || ''
const PRIVATE_KEY = [ liveNetworkPK ]
const ADDR = process.env.ADDR;
module.exports = {
  networks: {
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "222222222",
      websocket: true
    },
    bsc_testnet: {
      provider: () => new HDWalletProvider({
        privateKeys: PRIVATE_KEY,
        providerOrUrl: `https://data-seed-prebsc-1-s1.binance.org:8545`,
        pollingInterval: 56000
      }),
      network_id: 97,
      confirmations: 2,
      timeoutBlocks: 100,
      from: ADDR,
      skipDryRun: true,
      networkCheckTimeout: 999999
    },
    pulsechain_testnet: {
      provider: () => new HDWalletProvider({
        privateKeys: PRIVATE_KEY,
        providerOrUrl: `https://rpc.v2b.testnet.pulsechain.com`,
        pollingInterval: 56000
      }),
      network_id: 941,
      confirmations: 2,
      timeoutBlocks: 100,
      skipDryRun: true,
      from: ADDR,
      networkCheckTimeout: 999999
    },
    ethw_testnet: {
      provider: () => new HDWalletProvider({
        privateKeys: PRIVATE_KEY,
        providerOrUrl: `https://iceberg.ethereumpow.org/`,
        pollingInterval: 56000
      }),
      network_id: 10002,
      confirmations: 2,
      timeoutBlocks: 100,
      skipDryRun: true,
      from: ADDR,
      networkCheckTimeout: 999999
    },
    mumbai: {
      provider: () => new HDWalletProvider({
        privateKeys: PRIVATE_KEY,
        providerOrUrl: `https://matic-mumbai.chainstacklabs.com`,
        pollingInterval: 56000
      }),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      pollingInterval: 1000,
      skipDryRun: true,
      from: ADDR,
      networkCheckTimeout: 999999
      //websockets: true
    },
  },
  mocha: {
    timeout: 100_000
  },
  compilers: {
    solc: {
      version: "0.8.17",
      settings: {
        optimizer: {
          enabled: true,
          runs: 20
        },
        evmVersion: "london"
      }
    }
  },
  db: {
    enabled: false
  }
};
