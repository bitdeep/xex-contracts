// Contracts
const ethers = require('ethers');
const Main = artifacts.require("Main")
module.exports = async function(callback) {
    try {
        const main = await Main.deployed()
        // bsc_testnet
        console.log('bsc_testnet');
        await main.setTrustedRemoteAddress('10102', '0xaFe53b047f9338DF9e663ba4E52E9B04861E9593');
        // avax_fuji
        console.log('avax_fuji');
        await main.setTrustedRemoteAddress('10106', '0x5F34098e0a3A179c084466827697b744A21547Aa');
        // eth_goerli
        console.log('eth_goerli');
        await main.setTrustedRemoteAddress('10121', '0xB9755872F937D4ac44bdDa9565F2f7997c4d551e');
        // ftm_testnet
        console.log('ftm_testnet');
        await main.setTrustedRemoteAddress('10112', '0xaFd37A86044528010d0E70cDc58d0A9B5Eb03206');
        // polygon_mumbai
        console.log('polygon_mumbai');
        await main.setTrustedRemoteAddress('10109', '0x6069fbFe03605BDd08D44ee47481E51A4c9d8690');
    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
