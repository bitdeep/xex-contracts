// Contracts
const ethers = require('ethers');
const Main = artifacts.require("Main")
module.exports = async function(callback) {
    try {
        const accounts = await web3.eth.getAccounts()
        const main = await Main.deployed()
        console.log('main', main.address)
        const fee = (await main.fee()).toString();


        let adapterParams = ethers.utils.solidityPack(
            ["uint16", "uint", "uint", "address"],
            [2, 200000, 0, accounts[0]]
        );
        let LzCallParams = {
            refundAddress: accounts[0],
            zroPaymentAddress: accounts[0],
            adapterParams: []
        }

        const OneEther = '100000000000000000';
        const fees = await main.estimateSendFee('10109', accounts[0], OneEther, false, adapterParams);
        const nativeFee = fees.nativeFee.toString();

        console.log('mint fee', fee, 'send fee', nativeFee);


        // await main.setTrustedRemoteAddress('10106', '0xD92Cb0354299A4D1bf8C4BddAF776C30eF1d330D');

        // fuji to mumbai
        await main.setTrustedRemoteAddress('10109', '0xD17c84Df3a433728C424dAf131f6b0ECC2be9fBf');
        await main.sendFrom(accounts[0], '10109', accounts[0], OneEther, LzCallParams, {from: accounts[0], value: nativeFee});

    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
