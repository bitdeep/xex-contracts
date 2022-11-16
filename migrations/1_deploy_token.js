const Main = artifacts.require("Main");
const Math = artifacts.require("Math");
const Factory = artifacts.require("Factory");

module.exports = async function (deployer) {
  await deployer.deploy(Math);

  await deployer.link(Math, Main);
  await deployer.deploy(Main);
  const main = await Main.deployed();
  await deployer.deploy(Factory, main.address);

};
