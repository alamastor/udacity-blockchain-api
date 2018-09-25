"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const bitcoinMsg = require("bitcoinjs-message");
const { Block, Blockchain } = require("./simpleChain");
const {
  getValidationInfo,
  requestNewValidation,
  setValidated,
} = require("./validationRequest");

// Create a server with a host and port
const server = Hapi.server({
  host: "localhost",
  port: 8000,
  debug: { request: ["error"] },
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
        address: Joi.string().required(),
        star: Joi.object()
          .keys({
            ra: Joi.string().required(),
            dec: Joi.string().required(),
            mag: Joi.string(),
            constellation: Joi.string(),
            story: Joi.string()
              .max(500)
              .required(),
          })
          .required(),
      }),
    },
  },
  handler: async (request, h) => {
    const { address, star } = request.payload;
    const validationInfo = await getValidationInfo(address);
    if (!validationInfo) {
      const response = h.response({
        code: 404,
        msg: "address not foud",
      });
      response.code(404);
      return response;
    }

    if (validationInfo.validationWindow < 0) {
      const response = h.response({
        code: 400,
        msg: "validation window expired",
      });
      response.code(400);
      return response;
    }

    if (!validationInfo.validated) {
      const response = h.response({
        code: 401,
        msg: "request not validated",
      });
      response.code(401);
      return response;
    }

    // hex encode story
    star.story = new Buffer(star.story).toString("hex");

    const blockchain = new Blockchain();
    await blockchain.addBlock(new Block({ address, star }));
    return await blockchain.getBlock((await blockchain.getBlockHeight()) - 1);
  },
});

// Request validation endpoint
server.route({
  method: "POST",
  path: "/requestValidation",
  options: {
    payload: { allow: "application/json" },
    validate: {
      payload: Joi.object().keys({
        address: Joi.string().required(),
      }),
    },
  },
  handler: async request => {
    const address = request.payload.address;
    const { timeStamp, validationWindow } = await requestNewValidation(address);

    return {
      address: address,
      requestTimeStamp: timeStamp,
      message: `${address}:${timeStamp}:starRegistry`,
      validationWindow: validationWindow,
    };
  },
});

// Validate signature endpoint
server.route({
  method: "POST",
  path: "/message-signature/validate",
  options: {
    payload: { allow: "application/json" },
    validate: {
      payload: Joi.object().keys({
        address: Joi.string().required(),
        signature: Joi.string()
          .length(88)
          .required(),
      }),
    },
  },
  handler: async (request, h) => {
    const { address, signature } = request.payload;
    const validationInfo = await getValidationInfo(address);
    if (!validationInfo) {
      const response = h.response({
        code: 404,
        msg: "address not foud",
      });
      response.code(404);
      return response;
    }
    const { timeStamp, validationWindow } = validationInfo;

    if (validationWindow < 0) {
      const response = h.response({
        code: 400,
        msg: "validation window expired",
      });
      response.code(400);
      return response;
    }

    const message = `${address}:${timeStamp}:starRegistry`;
    let signatureValid;
    try {
      signatureValid = bitcoinMsg.verify(message, address, signature);
    } catch (_) {
      signatureValid = false;
    }
    if (signatureValid) {
      setValidated(address);
      return {
        registerStar: true,
        status: {
          address,
          requestTimeStamp: timeStamp,
          message,
          validationWindow,
        },
      };
    } else {
      return {
        registerStar: false,
        status: {
          address,
          requestTimeStamp: timeStamp,
          message,
          validationWindow,
        },
      };
    }
  },
});

server.route({
  method: "GET",
  path: "/stars/address:{address}",
  options: {
    validate: {
      params: {
        address: Joi.string(),
      },
    },
  },
  handler: async request => {
    return await new Blockchain().getBlocksByAddress(request.params.address);
  },
});

server.route({
  method: "GET",
  path: "/stars/hash:{hash}",
  options: {
    validate: {
      params: {
        hash: Joi.string(),
      },
    },
  },
  handler: async (request, h) => {
    const block = await new Blockchain().getBlockByBlockHash(
      request.params.hash,
    );
    if (block) {
      return block;
    } else {
      const response = h.response();
      response.code(404);
      return response;
    }
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
