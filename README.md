# Blockchain JSON API

Implemented with Hapi.js!
`npm start` to run on localhost:8000

## Endpoints

- GET http://localhost:8000/blockheight to get the current size of the blockchain.
- GET http://localhost:8000/block/{BLOCK_HEIGHT} where BLOCK_HEIGHT is the block the block number to get the block at that value. Will 404 error if BLOCK_HEIGHT is >= to the length of the blockchain.
- GET http://localhost:8000/star/address:{ADDRESS} where ADDRESS is a Bitcoin address to get all stars registered to an address.
- GET http://localhost:8000/star/hash:{HASH} to get the block with the the block hash HASH.

### Registering a star

1. POST { "address": ADDRESS } to http://localhost:8000/requestValidation, where ADDRESS is your Bitcoin address. You will recieve a JSON response containing a message field.
2. Sign the the message with your Bitcoin private key and POST { "address": ADDRESS, "signature": SIGNATURE } to http://localhost:8000/message-signature/validate, where SIGNATURE is the message signature. If the JSON response contains "registerStar": true then you have permission to register a star.
3. POST { "address": ADDRESS, "star": { "dec": DEC, "ra": RA, "story": STORY } } to http://localhost:8000/block, where is DEC is the star declination, RA is star right ascension and STORY is some info about the story to register your star, the data will be echoed back if successfull.
