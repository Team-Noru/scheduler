// src/dbService.js
const pool = require("./db");

// ========================================================
// 1) 기업 존재 여부 확인 + 없으면 INSERT
// ========================================================
async function findOrCreateCompany(company) {
  const conn = await pool.getConnection();
  try {
    const name = company.mapped_name;

    // 기존 기업 검색
    const [rows] = await conn.query(
      "SELECT company_id FROM companies WHERE name = ?",
      [name]
    );
    if (rows.length > 0) return rows[0].company_id;

    // analyzer에서 제공한 stock_code 우선 사용
    const stockCode = company.stock_code ?? null;

    const isDomestic = company.country === "Korea";
    const isListed = company.listing_status === "상장";

    console.log(`📌 신규 기업 추가: ${name} / stock_code=${stockCode}`);

    const [result] = await conn.query(
      `
      INSERT INTO companies (name, is_domestic, is_listed, stock_code)
      VALUES (?, ?, ?, ?)
      `,
      [name, isDomestic, isListed, stockCode]
    );

    return result.insertId;
  } finally {
    conn.release();
  }
}

// ========================================================
// 2) 뉴스 INSERT
// ========================================================
async function insertNews(article, companyId) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `
      INSERT INTO news
      (company_id, title, description, content, published_at, author,
       content_url, thumbnail_url, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        companyId,
        article.title,
        article.description,
        article.content,
        article.published_at,
        article.author,
        article.content_url,
        article.thumbnail_url,
        article.publisher
      ]
    );

    return result.insertId;
  } finally {
    conn.release();
  }
}

// ========================================================
// 3) 뉴스 이미지 INSERT
// ========================================================
async function insertNewsImages(newsId, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;

  const conn = await pool.getConnection();
  try {
    for (const url of imageUrls) {
      await conn.query(
        `
        INSERT INTO news_images (image_url, news_id)
        VALUES (?, ?)
        `,
        [url, newsId]
      );
    }
  } finally {
    conn.release();
  }
}

// ========================================================
// 4) 기업 감정 INSERT
// ========================================================
async function insertCompanySentiment(newsId, companyId, companyObj) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `
      INSERT INTO company_sentiments
      (sentiment, news_id, company_id)
      VALUES (?, ?, ?)
      `,
      [companyObj.sentiment, newsId, companyId]
    );
  } finally {
    conn.release();
  }
}

// ========================================================
// 5) 뉴스 중복 체크
// ========================================================
async function checkNewsExists(url) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT news_id FROM news WHERE content_url = ? LIMIT 1`,
      [url]
    );
    return rows.length > 0 ? rows[0].news_id : null;
  } finally {
    conn.release();
  }
}

// EXPORT
module.exports = {
  findOrCreateCompany,
  insertNews,
  insertNewsImages,
  insertCompanySentiment,
  checkNewsExists
};
