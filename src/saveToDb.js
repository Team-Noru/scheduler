const fs = require("fs");
const path = require("path");
const {
  findOrCreateCompany,
  insertNews,
  insertCompanySentiment,
} = require("./dbService");

async function saveJsonToDb(jsonFilePath) {
  const raw = fs.readFileSync(jsonFilePath, "utf-8");
  const articles = JSON.parse(raw);

  for (const article of articles) {
    console.log(`\n📰 뉴스 저장 중: ${article.title}`);

    // 1) 뉴스 저장
    const newsId = await insertNews(article);
    console.log(`   → news_id = ${newsId}`);

    // 2) 기업 분석 저장
    const companies = article.analysis?.companies ?? {};

    for (const name of Object.keys(companies)) {
      const companyObj = companies[name];

      // 2-1) 기업 존재 확인 후 없으면 생성
      const companyId = await findOrCreateCompany(companyObj);
      console.log(`   → 기업 처리: ${companyObj.mapped_name} (id=${companyId})`);

      // 2-2) 뉴스-기업 감정 레코드 저장
      await insertCompanySentiment(newsId, companyId, companyObj);
    }
  }

  console.log("\n🎉 모든 데이터 저장 완료!");
}

module.exports = saveJsonToDb;
