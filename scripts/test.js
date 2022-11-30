// Contracts
const ethers = require('ethers');
const Main = artifacts.require("Main")
module.exports = async function(callback) {
    try {
        const accounts = await web3.eth.getAccounts()
        const main = await Main.deployed()
        console.log('main', main.address)
        const fee = (await main.fee()).toString();
        console.log('fee', fee);

        let adapterParams = ethers.utils.solidityPack(
            ["uint16", "uint", "uint", "address"],
            [2, 200000, 0, accounts[0]]
        );
        let LzCallParams = ethers.utils.solidityPack(
            ["address", "address", "bytes"],
            [accounts[0], accounts[0], adapterParams]
        )

        const OneEther = '1000000000000000000';
        const fees = await main.estimateSendFee('10102', accounts[0], OneEther, false, LzCallParams);
        console.log('fees', fees);

    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
