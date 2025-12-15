const axios = require("axios");
const cheerio = require("cheerio");

function cleanText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")   // 스크립트 전체 삭제
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")     // 스타일 전체 삭제
    .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, "")     // 비디오 제거
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")   // iframe 제거
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(
      /본문 글씨 줄이기|본문 글씨 키우기|바로가기|복사하기|다른 공유 찾기|이 기사를 공유합니다|페이스북|트위터|카카오톡/g,
      ""
    )
    .replace(/무료상담/g, "")
    .trim();
}

async function crawlArticle(url, stockCode) {
  console.log(`📰 기사 크롤링: ${url}`);

  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(html);

  // ---------------------------
  // 1) 제목 파싱
  // ---------------------------
  let title = "";
  $('script').each((i, el) => {
    const scriptText = $(el).html();
    if (scriptText?.includes("window.GATrackingData")) {
      const match = scriptText.match(/title:\s*`([^`]+)`/);
      if (match) title = match[1].split(">").pop().trim();
    }
  });

  // ---------------------------
  // 2) description
  // ---------------------------
  const description = $('meta[name="description"]').attr("content") || "";

  // ---------------------------
  // 3) 본문 HTML
  // ---------------------------
  const contentHtml = $("#articletxt").html() || "";

  // ---------------------------
  // 4) 본문 이미지 수집 (썸네일 제외)
  // ---------------------------
  let image_urls = [];

  $("#articletxt img").each((i, el) => {
    let src = $(el).attr("src");
    if (!src) return;

    if (!src.startsWith("http")) {
      src = "https:" + src;
    }

    image_urls.push(src);
  });

  // **중복 제거**
  image_urls = [...new Set(image_urls)];

  // ---------------------------
  // 5) IMG 마커 삽입
  // ---------------------------
  const htmlWithMarkers = contentHtml.replace(
    /<img[^>]*src="([^"]+)"[^>]*>/g,
    () => `\n[IMG]\n`
  );

  // ---------------------------
  // 4) 썸네일 URL 추출 (NEW)
    // ---------------------------
  const thumbnail_url =
    $('meta[property="og:image"]').attr("content") ||
    $('link[rel="image_src"]').attr("href") ||
    "";

  const content = cleanText(htmlWithMarkers);

  // ---------------------------
  // 7) 메타데이터 추출
  // ---------------------------
  const published_at = $('meta[property="article:published_time"]').attr("content") || "";

  const author =
    $('meta[name="author"]').attr("content") ||
    $('meta[property="dable:author"]').attr("content") ||
    "";

  // ---------------------------
  // 8) 최종 결과 반환
  // ---------------------------
  return {
    stockCode,
    title,
    description,
    content,          // [IMG_n] 포함된 정리된 본문
    published_at,
    author,
    image_urls,
    thumbnail_url,
    content_url: url,
    publisher: "한국경제"
  };
}

module.exports = crawlArticle;
