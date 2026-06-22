"use strict";

const fs = require("fs");
const path = require("path");

const walletEnvKeys = [
  "USDT_TON_ADDRESS",
  "USDT_TRC20_ADDRESS",
  "USDT_BEP20_ADDRESS",
  "TON_ADDRESS",
  "BTC_ADDRESS",
];

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      const separatorIndex = trimmed.indexOf("=");

      if (!trimmed || trimmed.startsWith("#") || separatorIndex < 0) {
        return values;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
      return values;
    }, {});
}

module.exports = function handler(_request, response) {
  const localEnv = loadLocalEnv();
  const addresses = walletEnvKeys.reduce((result, key) => {
    result[key] = process.env[key] || localEnv[key] || "";
    return result;
  }, {});

  response.setHeader("Cache-Control", "no-store");
  response.status(200).json(addresses);
};
