// src/searchCrawler.js
const axios = require("axios");
const cheerio = require("cheerio");

async function searchNews(keyword) {
  console.log(`🔍 검색 중: ${keyword}`);

  const searchUrl = `https://search.hankyung.com/search/news?query=${encodeURIComponent(
    keyword
  )}&sort=RANK%2FDESC%2CDATE%2FDESC&period=ALL&area=title&exact=&include=&except=&hk_only=`;

  const { data: html } = await axios.get(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });

  const $ = cheerio.load(html);
  const links = [];

  $("ul.article li a[href], .result_article li a[href]").each((i, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let fullUrl = href.startsWith("http")
      ? href
      : `https://www.hankyung.com${href}`;

    // 1) www.hankyung.com 기사만 허용
    if (!fullUrl.startsWith("https://www.hankyung.com")) return;

    // 2) 기사 구조 /article/숫자 로 제한
    if (!/^https:\/\/www\.hankyung\.com\/article\/\d+/.test(fullUrl)) return;

    // 3) 중복 제거
    if (links.includes(fullUrl)) return;

    // 4) 최대 3개까지만 push (필터 통과 조건만 세는 것!)
    links.push(fullUrl);

    // 👉 이미 3개 모였으면 loop 종료
    if (links.length >= 10) return false;
  });

  return links;
}

module.exports = searchNews;
