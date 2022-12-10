// Contracts
const ethers = require('ethers');
const Main = artifacts.require("Main")
module.exports = async function(callback) {
    try {
        const main = await Main.deployed()
        // bsc_testnet
        console.log('bsc_testnet');
        await main.setTrustedRemoteAddress('10102', '0xa533fA4376e9996D7902909a174A52058032Cf84');
        // avax_fuji
        console.log('avax_fuji');
        await main.setTrustedRemoteAddress('10106', '0x8D3f803Cda3517D355d1c5ae78e2ea10B9Acdb29');
        // eth_goerli
        console.log('eth_goerli');
        await main.setTrustedRemoteAddress('10121', '0x92358EBA078b90Ef2F0e81c5A04A4ff0A1162bac');
        // ftm_testnet
        console.log('ftm_testnet');
        await main.setTrustedRemoteAddress('10112', '0x6AeCf42F748eaF4335ae9362591619B6D9F68870');
        // polygon_mumbai
        console.log('polygon_mumbai');
        await main.setTrustedRemoteAddress('10109', '0x4DFBD99C0660c5C42593Bc213A4C9B18fB21BBFa');
    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
