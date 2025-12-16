// src/dbService.js
const pool = require("./db");

// ========================================================
// 1) 기업 존재 여부 확인 + 없으면 INSERT
// ========================================================
async function findOrCreateCompany(company) {
  const conn = await pool.getConnection();
  try {
    const name = company.mapped_name;
    const stockCode = company.stock_code ?? null;

    if (stockCode) {
      const [rows] = await conn.query(
        "SELECT company_id FROM companies WHERE stock_code = ? LIMIT 1",
        [stockCode]
      );
      if (rows.length > 0) return rows[0].company_id;
    }

    const [rowsByName] = await conn.query(
      "SELECT company_id FROM companies WHERE name = ? LIMIT 1",
      [name]
    );
    if (rowsByName.length > 0) return rowsByName[0].company_id;

    const isDomestic = company.country === "Korea";
    const isListed = company.listing_status === "상장";

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
// 2) 뉴스 INSERT (summary 포함)
// ========================================================
async function insertNews(article, companyId) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `
      INSERT INTO news
      (company_id, title, description, content, summary, published_at, author,
       content_url, thumbnail_url, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        companyId,
        article.title,
        article.description,
        article.content,
        article.summary ?? null,
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
async function insertNewsImages(newsId, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;

  const conn = await pool.getConnection();
  try {
    for (const url of imageUrls) {
      await conn.query(
        `INSERT INTO news_images (image_url, news_id) VALUES (?, ?)`,
        [url, newsId]
      );
    }
  } finally {
    conn.release();
  }
}

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

module.exports = {
  findOrCreateCompany,
  insertNews,
  insertNewsImages,
  insertCompanySentiment,
  checkNewsExists
};
