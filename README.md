# Blockchain JSON API

Implemented with Hapi.js!
`node app.js` to run on localhost:8000

## Endpoints

- GET http://localhost:8000/blockheight to get the current size of the blockchain.
- GET http://localhost:8000/block/{BLOCK_HEIGHT} where BLOCK_HEIGHT is the block the block number to get the block at that value. Will 404 error if BLOCK_HEIGHT is >= to the length of the blockchain.
- POST { block: {DATA} } to http://localhost:8000/block, where DATA is a string or number, to add a new block with that value to to the blockchain.
