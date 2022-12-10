// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId == 740) // canto testnet
    await deploy('55072000000000000', '0x0000000000000000000000000000000000000000');
  else if (network.chainId == 97) // bsc testnet
    await deploy('34000000000000', '0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1');
  else if (network.chainId == 80001) // polygon testnet
    await deploy('12178000000000000', '0xf69186dfBa60DdB133E91E9A4B5673624293d8F8');
  else if (network.chainId == 43113) // avax testnet
    await deploy('810000000000000', '0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706');
  else if (network.chainId == 5) // eth testnet (goerli)
    await deploy('9000000000000', '0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23');
  else if (network.chainId == 4002)
    await deploy('41341000000000000', '0x7dcAD72640F835B0FA36EFD3D6d3ec902C7E5acf');
  else
    console.log(`${network.chainId} not supported.`);
}
async function deploy(fee, endpoint) {
  const Math = await hre.ethers.getContractFactory("Math");
  const math = await Math.deploy();
  await math.deployed();

  const Main = await hre.ethers.getContractFactory("Main", {
    libraries: {
      Math: math.address,
    }
  });
  const main = await Main.deploy(fee, endpoint);
  await main.deployed();

  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(main.address);
  await factory.deployed();

  console.log(
    `
    math ${math.address}
    main ${main.address}
    factory ${factory.address}
    `
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
