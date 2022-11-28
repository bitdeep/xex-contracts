const Main = artifacts.require("Main");
const Math = artifacts.require("Math");
const Factory = artifacts.require("Factory");

module.exports = async function (deployer) {
  const fee = '1000000000000000';
  const endpoint = '0x0000000000000000000000000000000000000000';
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
