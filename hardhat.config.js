require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config()
const liveNetworkPK = process.env.PRIVATE_KEY || ''
const PRIVATE_KEY = [ liveNetworkPK ]

task("setTreasure", "set treasure address")
    .addParam("contract", "contract to set the treasure")
    .addParam("wallet", "wallet to set as treasure")
    .setAction(async (taskArgs) => {
      const Main = await ethers.getContractFactory("Main")
      const main = Main.attach(taskArgs.contract);
      await main.setTreasure(taskArgs.wallet);
    });


task("setRemote", "set remote trust")
    .addParam("contract", "contract to set remote trust")
    .setAction(async (taskArgs) => {
      // canto_testnet
      // await setTrustedRemoteAddress(taskArgs.address, '', '');
      // bsc_testnet
      await setTrustedRemoteAddress(taskArgs.address, '10102', '0xa533fA4376e9996D7902909a174A52058032Cf84');
      // avax_fuji
      await setTrustedRemoteAddress(taskArgs.address, '10106', '0x8D3f803Cda3517D355d1c5ae78e2ea10B9Acdb29');
      // eth_goerli
      await setTrustedRemoteAddress(taskArgs.address, '10121', '0x92358EBA078b90Ef2F0e81c5A04A4ff0A1162bac');
      // ftm_testnet
      await setTrustedRemoteAddress(taskArgs.address, '10112', '0x6AeCf42F748eaF4335ae9362591619B6D9F68870');
      // polygon_mumbai
      await setTrustedRemoteAddress(taskArgs.address, '10109', '0x4DFBD99C0660c5C42593Bc213A4C9B18fB21BBFa');

    });

async function setTrustedRemoteAddress(contract, lzId, remoteAddress){
  const Main = await ethers.getContractFactory("Main")
  const main = Main.attach(contract);
  await main.setTrustedRemoteAddress(lzId, remoteAddress);
  console.log(`Set remote trust on contract ${contract} to id=${lzId} and address ${remoteAddress}: done.`);
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    canto_testnet: {
      url: `https://eth.plexnode.wtf/`,
      accounts: [`${PRIVATE_KEY}`],
      live: true,
      saveDeployments: true,
    },
    bsc_testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      accounts: [`${PRIVATE_KEY}`],
      live: true,
      saveDeployments: true,
    },
    avax_testnet: {
      url: `https://api.avax-test.network/ext/bc/C/rpc`,
      accounts: [`${PRIVATE_KEY}`],
      live: true,
      saveDeployments: true,
    },
    eth_testnet: {
      url: `https://rpc.ankr.com/eth_goerli`,
      accounts: [`${PRIVATE_KEY}`],
      live: true,
      saveDeployments: true,
    },
    ftm_testnet: {
      url: `https://rpc.ankr.com/fantom_testnet`,
      accounts: [`${PRIVATE_KEY}`],
      live: true,
      saveDeployments: true,
    },
    polygon_testnet: {
      url: `https://rpc.ankr.com/polygon_mumbai`,
      accounts: [`${PRIVATE_KEY}`],
      live: true,
      saveDeployments: true,
    },
    hardhat: {
      blockGasLimit: 12_450_000,
      hardfork: "london"
    },
    localhost: {
      url: 'http://localhost:8545',
    },
  },
  etherscan: {
    apiKey: `${process.env.API_KEY}`
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
        },
      },
    ],
  },
};
