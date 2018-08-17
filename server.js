"use strict";

const Hapi = require("hapi");
const { Block, Blockchain } = require("./simpleChain");

// Create a server with a host and port
const server = Hapi.server({
  host: "localhost",
  port: 8000,
});

// Add the route
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
