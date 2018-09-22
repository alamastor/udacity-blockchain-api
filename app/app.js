"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const { Block, Blockchain } = require("./simpleChain");
const validationRequestDb = require("level")("./validationrequestdata");

// Create a server with a host and port
const server = Hapi.server({
  host: "localhost",
  port: 8000,
});

// Get block route
server.route({
  method: "GET",
  path: "/block/{height}",
  options: {
    validate: {
      params: { height: Joi.number().integer() },
    },
  },
  handler: async (request, h) => {
    const blockHeight = parseInt(request.params.height, 10);
    const blockchain = new Blockchain();
    if (blockHeight >= (await blockchain.getBlockHeight())) {
      const response = h.response();
      response.code(404);
      return response;
    } else {
      return await blockchain.getBlock(blockHeight);
    }
  },
});

// Get block height route
server.route({
  method: "GET",
  path: "/blockheight",
  handler: async () => ({
    blockHeight: await new Blockchain().getBlockHeight(),
  }),
});

// Post block route
server.route({
  method: "POST",
  path: "/block",
  options: {
    payload: { allow: "application/json" },
    validate: {
      payload: Joi.object().keys({
        body: Joi.alternatives().try(Joi.number(), Joi.string()),
      }),
    },
  },
  handler: async request => {
    const blockchain = new Blockchain();
    await blockchain.addBlock(new Block(request.payload.body));
    return await blockchain.getBlock((await blockchain.getBlockHeight()) - 1);
  },
});

// Post block route
server.route({
  method: "POST",
  path: "/requestValidation",
  options: {
    payload: { allow: "application/json" },
    validate: {
      payload: Joi.object().keys({
        address: Joi.number(),
      }),
    },
  },
  handler: async request => {
    const address = request.payload.address;
    const validationWindow = 30;
    let timeStamp;
    try {
      timeStamp = await validationRequestDb.get(address);
      if ((Date.now() - timeStamp) / 1000 > validationWindow) {
        timeStamp = Date.now();
      }
    } catch (err) {
      if (err.notFound) {
        timeStamp = Date.now();
      } else {
        throw err;
      }
    }

    validationRequestDb.put(address, timeStamp);

    return {
      address: address,
      requestTimeStamp: timeStamp,
      message: `${address}:${timeStamp}:starRegistry`,
      validationWindow: Math.round(
        validationWindow - (Date.now() - timeStamp) / 1000,
      ),
    };
  },
});

// Start the server
async function start() {
  try {
    await server.start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log("Server running at:", server.info.uri);
}

module.exports = { start };
