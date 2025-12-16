// src/index.js
const fs = require("fs");
const path = require("path");
const keywords = require("./keywords");
const stockMap = require("./stockMap");

const crawlSearchResults = require("./searchCrawler");
const crawlArticle = require("./articleCrawler");
const analyzeArticle = require("./analyzer");

const {
  findOrCreateCompany,
  insertNews,
  insertNewsImages,
  insertCompanySentiment,
  checkNewsExists
} = require("./dbService");

async function main() {
  console.log("🚀 뉴스 크롤링 + 분석 + DB 저장 시작!");

  for (const companyName of keywords) {
    console.log(`\n=============================`);
    console.log(`📌 키워드: ${companyName}`);
    console.log(`=============================`);

    const links = await crawlSearchResults(companyName);
    console.log("🔗 추출된 링크:", links);

    for (const url of links) {
      const article = await crawlArticle(url);

      if (!article.title || !article.content) {
        console.log("⏭️ 제목/본문 없음 → 스킵");
        continue;
      }

      // 1) 중복 뉴스 확인
      const existedNewsId = await checkNewsExists(article.content_url);
      if (existedNewsId) {
        console.log(`⚠ 이미 저장된 뉴스 → 스킵 (news_id=${existedNewsId})`);
        continue;
      }

      // 2) GPT 분석
      const analysis = await analyzeArticle(article);
      const finalData = { ...article, summary: analysis.summary, analysis };

      const companies = analysis?.companies ?? {};

      // 3) 대표 기업 찾기
      let mainCompanyId = null;
      if (companies[companyName]) {
        mainCompanyId = await findOrCreateCompany(companies[companyName]);
      }

      // 4) 뉴스 저장
      const newsId = await insertNews(finalData, mainCompanyId);
      console.log(`💾 뉴스 저장 완료 → news_id=${newsId}`);

      // 5) 이미지 저장
      if (article.image_urls?.length > 0) {
        await insertNewsImages(newsId, article.image_urls);
        console.log(`🖼 이미지 ${article.image_urls.length}개 저장됨`);
      }

      // 6) 기업 감정 저장
      for (const [corpName, comp] of Object.entries(companies)) {
        const companyId = await findOrCreateCompany(comp);
        await insertCompanySentiment(newsId, companyId, comp);
        console.log(`   ➕ 기업 감정 저장: ${corpName} (id=${companyId})`);
      }

      // 7) JSON 백업 저장
      const saveDir = path.join(__dirname, "saved");
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

      fs.writeFileSync(
        path.join(saveDir, `${newsId}.json`),
        JSON.stringify(finalData, null, 2)
      );
    }
  }

  console.log("\n🎉 전체 처리 완료!");
}

module.exports = main;

if (require.main === module) {
  main();
}
