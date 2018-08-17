const { Block, Blockchain, db } = require("./simpleChain");

Promise.resolve()
  .then(async () => {
    // create 10 blocks
    const blockchain = new Blockchain();

    // add 10 blocks
    for (let i = 0; i < 10; i++) {
      await blockchain.addBlock(new Block("test block " + i));
    }
    console.log("blockheight: ", await blockchain.getBlockHeight());

    // Validate blockchain
    await blockchain.validateChain();

    // Corrupt blockchain
    const inducedErrorBlocks = [2, 4, 7];
    inducedErrorBlocks.forEach(async blockNo => {
      const badBlock = await blockchain.getBlock(blockNo);
      badBlock.data = "induced chain error";
      await db.put(blockNo, JSON.stringify(badBlock));
    });
    await blockchain.validateChain();
  })
  .catch(console.log.bind(console));
