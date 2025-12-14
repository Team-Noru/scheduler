const corpList = require("./data/corp_merged.json");

function findStockCodeByName(name) {
  const corp = corpList.find(c => c.name === name);
  if (!corp) return null;

  // 우선순위: ticker → dart_stock_code
  return corp.ticker
}

module.exports = { findStockCodeByName };
