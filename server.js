"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const { Block, Blockchain } = require("./simpleChain");

// Create a server with a host and port
const server = Hapi.server({
  host: "localhost",
  port: 8000,
});

// Get block route
server.route({
  method: "GET",
  path: "/block/{height}",
  handler: async function(request, h) {
    const blockHeight = parseInt(request.params.height, 10);
    const blockchain = new Blockchain();
    let response;
    if (blockHeight >= (await blockchain.getBlockHeight())) {
      response = h.response();
      response.code(404);
    } else {
      const block = await blockchain.getBlock(blockHeight);
      response = h.response(JSON.stringify(block));
    }
    response.type("application/json");
    return response;
  },
});

// Get block height route
server.route({
  method: "GET",
  path: "/blockheight",
  handler: async function(request, h) {
    const blockchain = new Blockchain();
    const response = h.response(
      JSON.stringify({ blockHeight: await blockchain.getBlockHeight() }),
    );
    response.type("application/json");
    return response;
  },
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
  handler: async function(request, h) {
    const blockchain = new Blockchain();
    await blockchain.addBlock(new Block(request.payload.body));
    const response = h.response();
    response.code(201);
    return response;
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

start();
