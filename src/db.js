const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "noru1234",
  database: "stock_db", // ← DB 이름 넣기!
});

module.exports = pool;
