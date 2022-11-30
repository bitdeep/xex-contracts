const HDWalletProvider = require('@truffle/hdwallet-provider')
const dotenv = require("dotenv")

dotenv.config()
const liveNetworkPK = process.env.PRIVATE_KEY || ''
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
    avax_fuji: {
      provider: () => new HDWalletProvider({
        privateKeys: PRIVATE_KEY,
        providerOrUrl: `https://api.avax-test.network/ext/bc/C/rpc`,
        pollingInterval: 56000
      }),
      network_id: 43113,
      confirmations: 2,
      timeoutBlocks: 100,
      skipDryRun: true,
      from: ADDR,
      networkCheckTimeout: 999999
    },
    eth_sepolia: {
      provider: () => new HDWalletProvider({
        privateKeys: PRIVATE_KEY,
        providerOrUrl: `https://rpc.sepolia.org`,
        pollingInterval: 56000
      }),
      network_id: 11155111,
      confirmations: 2,
      timeoutBlocks: 100,
      skipDryRun: true,
      from: ADDR,
      networkCheckTimeout: 999999
    },
    polygon_mumbai: {
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
          runs: 1
        },
        evmVersion: "london"
      }
    }
  },
  db: {
    enabled: false
  }
};
