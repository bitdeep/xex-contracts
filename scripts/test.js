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
        const fees = await main.estimateSendFee('10102', accounts[0], OneEther, false, adapterParams);
        const nativeFee = fees.nativeFee.toString();

        console.log('mint fee', fee, 'send fee', nativeFee);

        // bnb to mumbai
        // await main.setTrustedRemoteAddress('10102', '0xae020c862b6e181425b33dC5E909345bf04e27a4');

        // fuji to mumbai
        await main.setTrustedRemoteAddress('10109', '0x9Ea1689e41e46b072079e7e2Fd606Eb8ecD70875');
        await main.sendFrom(accounts[0], '10109', accounts[0], OneEther, LzCallParams, {from: accounts[0], value: nativeFee});

    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
