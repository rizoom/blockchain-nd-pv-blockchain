/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persistent storage method.
 *
 */

const SHA256 = require("crypto-js/sha256");
const BlockClass = require("./block.js");
const bitcoinMessage = require("bitcoinjs-message");

const VALIDATION_TIMEOUT_SECONDS = 5 * 60;

const timestamp = () =>
  new Date()
    .getTime()
    .toString()
    .slice(0, -3);

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialize the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      const block = new BlockClass.Block({ data: "Genesis Block" });
      await this._addBlock(block);
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return Promise.resolve(this.height);
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  _addBlock(block) {
    // Block height
    block.height = this.height + 1;
    // UTC timestamp
    block.time = timestamp();

    // previous block hash
    if (this.chain.length > 0) {
      const previousBlock = this.chain[this.chain.length - 1];
      block.previousBlockHash = previousBlock.hash;
    }

    // Block hash with SHA256 using block and converting to a string
    block.hash = SHA256(JSON.stringify(block)).toString();

    // add block
    this.chain.push(block);
    this.height = this.height + 1;

    return Promise.resolve(block);
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    const message = [address, timestamp(), "starRegistry"].join(":");
    return Promise.resolve(message);
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  async submitStar(address, message, signature, star) {
    const messageTime = Number.parseInt(message.split(":")[1], 10);
    const currentTime = timestamp();

    if (currentTime - messageTime > VALIDATION_TIMEOUT_SECONDS) {
      return Promise.reject(
        new Error("Star should be submitted within 5 minutes.")
      );
    } else if (!bitcoinMessage.verify(message, address, signature)) {
      return Promise.reject(new Error("Invalid signature."));
    }

    // create new block and add it to the chain
    const block = new BlockClass.Block({
      data: {
        owner: address,
        star
      }
    });

    return await this._addBlock(block);
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    const block = this.chain.find(block => block.hash === hash);
    return Promise.resolve(block);
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    const block = this.chain.find(block => block.height === height);
    return Promise.resolve(block);
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  async getStarsByWalletAddress(address) {
    const blocksData = await Promise.all(
      this.chain
        .slice(1) // ignore genesis block
        .map(block => block.getBData())
    );

    return Promise.resolve(
      blocksData.filter(blockData => blockData.owner === address)
    );
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  async validateChain() {
    const validityByIndex = await Promise.all(
      this.chain.map(block => block.validate())
    );
    const errorLog = this.chain.filter((block, index) => {
      // valid block are filtered out from error log
      if (validityByIndex[index]) {
        return false;
      }
      // compare blocks hash link
      const nextBlock = this.chain[block.height + 1];
      // keep in error log when hashes differ
      return nextBlock && nextBlock.previousBlockHash !== block.hash;
    });

    return Promise.resolve(errorLog);
  }
}

module.exports.Blockchain = Blockchain;
