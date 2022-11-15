// SPDX-License-Identifier: MIT
const { ethers } = require("ethers");
const Main = artifacts.require("Main")
require('dotenv').config()
const { time } = require('openzeppelin-test-helpers');

async function timeIncreaseTo (seconds) {
    const delay = 1000 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

contract("default", async accounts => {
    let src, dst;
    let term = 2;
    const dev = accounts[0];
    before(async () => {
        try {
            src = await Main.deployed()
            dst = await Main.deployed()
        } catch (e) {
            console.error(e)
        }
    })
    it("main", async () => {
        const chainid = (await (web3.eth.getChainId())).toString();
        const fee = (await src.fee()).toString();
        await src.claimRank(term, {from: dev, value: fee});
        const userMints = await src.userMints(dev);
        const ts = parseInt(userMints.maturityTs)+1;
        await timeIncreaseTo(ts);
        await src.claimMintReward({from: dev, value: fee});
        const srcBalance = (await src.balanceOf(dev)).toString();
        await src.burnFromBridge(srcBalance, chainid, {from: dev, value: fee});
        const burnInfo = (await src.bridgeLastUserBurn(dev));
        const signature = await web3.eth.sign(burnInfo.tx, dev);
        const { v, r, s } = ethers.utils.splitSignature(signature);
        await dst.mintFromBridge(v, r, s, srcBalance, burnInfo.id, burnInfo.src, burnInfo.timestamp, {from: dev, value: fee} );
    })

})

