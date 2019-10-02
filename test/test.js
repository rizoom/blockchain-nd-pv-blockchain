/**
 * Some simple unit tests
 */
const assert = require("assert");

const BlockChain = require("../src/blockchain.js");
const BlockClass = require("../src/block.js");
const SHA256 = require("crypto-js/sha256");

// Scenario : test validateChain function
// create a blockchain and add some blocks.
this.blockchain = new BlockChain.Blockchain();
const addBlockProcess = Promise.all(
  ["foo", "bar", "qux"]
    .map(data => new BlockClass.Block({ data: "foo" }))
    .map(block => this.blockchain._addBlock(block))
);

addBlockProcess.then(async blocks => {
  // ensure chain is valid
  assert.deepStrictEqual(
    await this.blockchain.validateChain(),
    [],
    "expected chain validation to succeed and have an empty error log."
  );

  // modify the hash of a block and ensure chain is not valid anymore
  const invalidBlock = blocks[1];
  invalidBlock.hash = SHA256("invalid hash").toString();
  assert.deepStrictEqual(
    await this.blockchain.validateChain(),
    [invalidBlock],
    "expected chain validation to contains an invalid block in it's error log."
  );

  console.info("All assertions successfully passed.");
});
