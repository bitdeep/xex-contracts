const Main = artifacts.require("Main");
const Math = artifacts.require("Math");
const Factory = artifacts.require("Factory");

module.exports = async function (deployer, network) {
  if( network == 'bsc_testnet') await bsc_testnet(deployer, '34000000000000', '0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1');
  else if( network == 'polygon_mumbai') await bsc_testnet(deployer, '12178000000000000', '0xf69186dfBa60DdB133E91E9A4B5673624293d8F8');
  else if( network == 'avax_fuji') await bsc_testnet(deployer, '810000000000000', '0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706');
  else console.log(`${network} not supported.`);
}
async function bsc_testnet(deployer, fee, endpoint){
  await deployer.deploy(Math);
  await deployer.link(Math, Main);
  await deployer.deploy(Main, fee, endpoint);
  const main = await Main.deployed();
  const math = await Math.deployed();
  await deployer.deploy(Factory, main.address);
  const factory = await Factory.deployed();

  console.log('math', math.address);
  console.log('main', main.address);
  console.log('factory', factory.address);

};
