// singleRunner.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crawlArticle = require("./articleCrawler");
const analyzeArticle = require("./analyzer");

// ✔ 원하는 URL / 파일명 / stockCode를 아래에 직접 넣어!
const URL = "https://www.hankyung.com/article/202512120070i";
const FILE_NAME = "test";
const STOCK_CODE = "005930";   // 필요 없으면 "" 로 두면 됨

async function runSingle(url, fileName, stockCode = "") {
  try {
    console.log("\n===============================");
    console.log("📰 단일 기사 처리 시작!");
    console.log("===============================");
    console.log("📌 URL:", url);

    // 1) 기사 크롤링
    const articleData = await crawlArticle(url, stockCode);

    // 2) GPT 분석
    const analysis = await analyzeArticle(articleData);

    // 3) 두 데이터 합치기
    const finalData = {
      ...articleData,
      analysis,
    };

    // 4) 저장 디렉토리
    const saveDir = path.join(__dirname, "data/single");
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

    // 5) JSON 저장
    const filePath = path.join(saveDir, `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));

    console.log(`\n✅ JSON 저장 완료 → ${filePath}`);
    console.log("🎉 단일 기사 분석 종료!\n");

  } catch (err) {
    console.error("❌ 오류 발생!", err);
  }
}

// 👇 원하는 값으로 넣어놓았으니까 실행하면 바로 돌아감
runSingle(URL, FILE_NAME, STOCK_CODE);

module.exports = runSingle;
