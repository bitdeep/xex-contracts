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
        await src.claimRank(term, {from: dev});
        const userMints = await src.userMints(dev);
        const ts = parseInt(userMints.maturityTs)+1;
        await timeIncreaseTo(ts);
        await src.claimMintReward({from: dev});
        const srcBalance = (await src.balanceOf(dev)).toString();
        await src.burnFromBridge(srcBalance);
        const tx = (await src.bridgeLastUserBurn(dev)).toString();
        const hash = await dst.bridgeEncodeData(dev, srcBalance, tx);
        const signature = await web3.eth.sign(hash, dev);
        const { v, r, s } = ethers.utils.splitSignature(signature);
        await dst.mintFromBridge(v, r, s, srcBalance, tx);
    })

})

