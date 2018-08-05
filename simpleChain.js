/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {

  // Add genesis block. Constructor functions can't be async,
  // so this should be called at the start of all public methods
  // to make sure genesis block has been created.
  async _init() {
    if (await this._getBlockHeight() === 0) {
      await this._addBlock(new Block("Genesis block"));
    }
  }

  // Add new block
  async addBlock(newBlock){
    await this._init();
    await this._addBlock(newBlock);
  }

  async _addBlock(newBlock) {
    // Block heigh
    const height = await this._getBlockHeight();
    newBlock.height = height;
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if (height > 0) {
      newBlock.previousBlockHash = (await this.getBlock(height - 1)).hash;
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Add block object to db
    await db.put(height, JSON.stringify(newBlock));
  }

  // Get block height stored in db
  async getBlockHeight(){
    await this._init();
    return await this._getBlockHeight();
  }

  // Get block height stored in db without calling init
  _getBlockHeight() {
    let height = 0;
    return new Promise((resolve, reject) => {
      db.createReadStream()
        .on('data', () => {
          height++;
        })
        .on('end', () => resolve(height))
        .on('error', reject)});
  }

  // get block
  async getBlock(blockHeight){
    await this._init();
    const block = await db.get(blockHeight)
    return JSON.parse(block);
  }

  // validate block
  async validateBlock(blockHeight){
    await this._init();

    // get block object
    let block = await this.getBlock(blockHeight);
    // get block hash
    let blockHash = block.hash;
    // remove block hash to test block integrity
    block.hash = '';
    // generate block hash
    let validBlockHash = SHA256(JSON.stringify(block)).toString();
    // Compare
    if (blockHash===validBlockHash) {
      return true;
    } else {
      console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+' <> '+validBlockHash);
      return false;
    }
  }

  // Validate blockchain
  async validateChain(){
    await this._init();
    const errorLog = [];
    const blockHeight = await this._getBlockHeight();
    for (let i = 0; i < blockHeight - 2; i++) {
      // validate block
      const valid = await this.validateBlock(i);
      if (valid) {
        const block = await this.getBlock(i);
        const nextBlock = await this.getBlock(i + 1);
        if (block.hash !== nextBlock.previousBlockHash) {
          errorLog.push(i);
        }
      } else {
        errorLog.push(i)
      }
    }
    if (errorLog.length > 0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: ' + errorLog);
    } else {
      console.log('No errors detected');
    }
  }
}

module.exports = {
  Block,
  Blockchain,
  db
}