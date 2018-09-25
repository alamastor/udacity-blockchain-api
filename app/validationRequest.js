const db = require("level")("./validationrequestdata");

const VALIDATION_WINDOW_SECONDS = 300;

async function getValidationInfo(address) {
  try {
    const { timeStamp, validated } = JSON.parse(await db.get(address));
    return {
      timeStamp: timeStamp,
      validationWindow: Math.round(
        VALIDATION_WINDOW_SECONDS - (Date.now() - timeStamp) / 1000,
      ),
      validated: validated,
    };
  } catch (err) {
    if (err.notFound) {
      return null;
    } else {
      throw err;
    }
  }
}

async function requestNewValidation(address) {
  let timeStamp;
  try {
    ({ timeStamp } = JSON.parse(await db.get(address)));
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

  await db.put(address, JSON.stringify({ timeStamp, validated: false }));

  return {
    timeStamp,
    validationWindow: Math.round(
      VALIDATION_WINDOW_SECONDS - (Date.now() - timeStamp) / 1000,
    ),
    validated: false,
  };
}

async function setValidated(address) {
  const info = JSON.parse(await db.get(address));
  info.validated = true;
  await db.put(address, JSON.stringify(info));
}

async function deleteRequest(address) {
  await db.del(address);
}

module.exports = {
  getValidationInfo,
  requestNewValidation,
  setValidated,
  deleteRequest,
};
