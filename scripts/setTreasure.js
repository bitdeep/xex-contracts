// Contracts
const ethers = require('ethers');
const Main = artifacts.require("Main")
module.exports = async function(callback) {
    const address = '0x10377a6d900f43D0b1aD699E99CfF6F1800aCD4C';
    try {
        const main = await Main.deployed()
        await main.setTreasure(address);
    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
