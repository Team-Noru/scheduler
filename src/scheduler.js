const cron = require("node-cron");
const mainCrawler = require("./index");
const { exec } = require("child_process");

console.log("⏰ 뉴스 크롤러 스케줄러 시작됨!");
console.log("🕒 현재 시간:", new Date().toString());

cron.schedule(
  "7 0 * * *",
  async () => {
    const now = new Date();
    console.log("🚀 [TRIGGERED] 크롤링 실행됨!");
    console.log("🕒 실행 시각(KST):", now.toString());

    try {
      await mainCrawler();
      console.log("✅ 크롤링 완료!");

      console.log("🐍 Neo4j Import 스크립트 실행!");
      exec("python ./src/neo4j/import_news_relations.py", (error, stdout, stderr) => {
        if (error) {
          console.error("❌ 파이썬 실행 오류:", error.message);
          return;
        }
        if (stderr) {
          console.error("⚠️ 파이썬 stderr:", stderr);
        }
        console.log("📥 파이썬 결과:");
        console.log(stdout);
      });
    } catch (err) {
      console.error("❌ 스케줄러 실행 중 에러:", err);
    }
  },
  {
    timezone: "Asia/Seoul",
  }
);
