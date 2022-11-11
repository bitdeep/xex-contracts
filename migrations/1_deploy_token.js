const Main = artifacts.require("Main");
const Math = artifacts.require("Math");

module.exports = async function (deployer) {
  await deployer.deploy(Math);

  await deployer.link(Math, Main);
  await deployer.deploy(Main);

};
