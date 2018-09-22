"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const bitcoinMsg = require("bitcoinjs-message");
const { Block, Blockchain } = require("./simpleChain");
const validationRequestDb = require("level")("./validationrequestdata");

const VALIDATION_WINDOW_SECONDS = 300;

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
    let timeStamp;
    try {
      ({ timeStamp } = JSON.parse(await validationRequestDb.get(address)));
    } catch (err) {
      if (err.notFound) {
        const response = h.response({
          code: 404,
          msg: "address not foud",
        });
        response.code(404);
        return response;
      } else {
        throw err;
      }
    }

    if ((Date.now() - timeStamp) / 1000 > VALIDATION_WINDOW_SECONDS) {
      const response = h.response({
        code: 400,
        msg: "validation window expired",
      });
      response.code(400);
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
    let timeStamp;
    try {
      ({ timeStamp } = JSON.parse(await validationRequestDb.get(address)));
      if ((Date.now() - timeStamp) / 1000 > VALIDATION_WINDOW_SECONDS) {
        timeStamp = Date.now();
      }
    } catch (err) {
      if (err.notFound) {
        timeStamp = Date.now();
      } else {
        throw err;
      }
    }

    validationRequestDb.put(
      address,
      JSON.stringify({ timeStamp, validated: false }),
    );

    return {
      address: address,
      requestTimeStamp: timeStamp,
      message: `${address}:${timeStamp}:starRegistry`,
      validationWindow: Math.round(
        VALIDATION_WINDOW_SECONDS - (Date.now() - timeStamp) / 1000,
      ),
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
    let timeStamp;
    try {
      ({ timeStamp } = JSON.parse(await validationRequestDb.get(address)));
    } catch (err) {
      if (err.notFound) {
        const response = h.response();
        response.code(404);
        return response;
      } else {
        throw err;
      }
    }
    const message = `${address}:${timeStamp}:starRegistry`;
    let signatureValid;
    try {
      signatureValid = bitcoinMsg.verify(message, address, signature);
    } catch (_) {
      signatureValid = false;
    }
    if (signatureValid) {
      validationRequestDb.put(
        address,
        JSON.stringify({ timeStamp, validated: true }),
      );
      return {
        registerStar: true,
        status: {
          address,
          requestTimeStamp: timeStamp,
          message,
          validationWindow: Math.round(
            VALIDATION_WINDOW_SECONDS - (Date.now() - timeStamp) / 1000, //
          ),
        },
      };
    } else {
      return {
        registerStar: false,
        status: {
          address,
          requestTimeStamp: timeStamp,
          message,
          validationWindow: Math.round(
            VALIDATION_WINDOW_SECONDS - (Date.now() - timeStamp) / 1000, //
          ),
        },
      };
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
