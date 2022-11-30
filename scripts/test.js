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

        const dst = '10102';
        console.log('mint fee', fee, 'send fee', nativeFee);

        // mumbai from fuji
        // await main.setTrustedRemoteAddress('10106', '0x35fb4895b68aC7A2D11da59d4E9f520c9C86A546');

        // fuji to mumbai
        await main.setTrustedRemoteAddress(dst, '0xd3398d9038A57f503f14a1F6eb463292b1caDDa6');
        await main.sendFrom(accounts[0], dst, accounts[0], OneEther, LzCallParams, {from: accounts[0], value: nativeFee});

    }
    catch(error) {
        console.log(error.toString())
    }
    callback()
}
