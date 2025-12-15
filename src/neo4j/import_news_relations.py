# src/neo4j/import_news_relations.py

import os
import json
from neo4j import GraphDatabase
from dotenv import load_dotenv

# ============================================
# 환경 변수 로드
# ============================================
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))   # src/
JSON_DIR = os.path.join(BASE_DIR, "saved")              # src/saved

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD)
)

# ============================================
# 🔍 기존 관계 존재 여부 확인
#   (ticker 우선, 없으면 name 기준)
# ============================================
def relation_exists(tx, source, target, news_id, s_ticker, t_ticker):
    result = tx.run(
        """
        MATCH (s:Entity)-[r:RELATION {news_id: $news_id}]->(t:Entity)
        WHERE
            ( ($s_ticker IS NOT NULL AND s.ticker = $s_ticker)
              OR ($s_ticker IS NULL AND s.name = $source) )
        AND
            ( ($t_ticker IS NOT NULL AND t.ticker = $t_ticker)
              OR ($t_ticker IS NULL AND t.name = $target) )
        RETURN r
        LIMIT 1
        """,
        source=source,
        target=target,
        news_id=news_id,
        s_ticker=s_ticker,
        t_ticker=t_ticker
    )
    return result.single() is not None

# ============================================
# 🔥 노드 + 관계 저장
#   - ticker 있으면 ticker 기준
#   - 없으면 name 기준
# ============================================
def save_relation(tx, rel, news_id):

    source = rel["source"]
    target = rel["target"]

    rel_type = rel["relation_type"]
    reason = rel["relation_reason"]

    s_ticker = rel.get("source_ticker")
    t_ticker = rel.get("target_ticker")

    s_is_listed = rel.get("source_is_listed")
    t_is_listed = rel.get("target_is_listed")

    s_country = rel.get("source_country")
    t_country = rel.get("target_country")

    # --------------------------
    # 중복 관계 방지
    # --------------------------
    if relation_exists(tx, source, target, news_id, s_ticker, t_ticker):
        print(f"이미 존재 → {source} → {target} (news {news_id})")
        return

    # --------------------------
    # Cypher 실행
    # --------------------------
    tx.run(
        """
        // =========================
        // Source Entity
        // =========================
        FOREACH (_ IN CASE WHEN $s_ticker IS NOT NULL THEN [1] ELSE [] END |
            MERGE (s:Entity {ticker: $s_ticker})
            SET s.name = $source,
                s.is_listed = $s_is_listed,
                s.country = $s_country
        )
        FOREACH (_ IN CASE WHEN $s_ticker IS NULL THEN [1] ELSE [] END |
            MERGE (s:Entity {name: $source})
            SET s.is_listed = $s_is_listed,
                s.country = $s_country
        )

        // =========================
        // Target Entity
        // =========================
        FOREACH (_ IN CASE WHEN $t_ticker IS NOT NULL THEN [1] ELSE [] END |
            MERGE (t:Entity {ticker: $t_ticker})
            SET t.name = $target,
                t.is_listed = $t_is_listed,
                t.country = $t_country
        )
        FOREACH (_ IN CASE WHEN $t_ticker IS NULL THEN [1] ELSE [] END |
            MERGE (t:Entity {name: $target})
            SET t.is_listed = $t_is_listed,
                t.country = $t_country
        )

        // 🔥 FOREACH 이후 스코프 정리
        WITH
            $source AS source,
            $target AS target,
            $s_ticker AS s_ticker,
            $t_ticker AS t_ticker,
            $news_id AS news_id,
            $rel_type AS rel_type,
            $reason AS reason

        MATCH (s:Entity), (t:Entity)
        WHERE
            ( (s_ticker IS NOT NULL AND s.ticker = s_ticker)
              OR (s_ticker IS NULL AND s.name = source) )
        AND
            ( (t_ticker IS NOT NULL AND t.ticker = t_ticker)
              OR (t_ticker IS NULL AND t.name = target) )

        MERGE (s)-[r:RELATION {news_id: news_id}]->(t)
        SET r.rel_type = rel_type,
            r.rel_reason = reason,
            r.event_tag = "NEWS"
        """,
        source=source,
        target=target,
        s_ticker=s_ticker,
        t_ticker=t_ticker,
        s_is_listed=s_is_listed,
        t_is_listed=t_is_listed,
        s_country=s_country,
        t_country=t_country,
        rel_type=rel_type,
        reason=reason,
        news_id=news_id
    )

    print(f"추가됨: {source} → {target} ({rel_type}) [news {news_id}]")

# ============================================
# 📌 JSON 파일 하나 처리
# ============================================
def process_single_json(path, filename):
    news_id = filename.replace(".json", "")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    relations = data.get("analysis", {}).get("relations", [])

    if not relations:
        print(f"관계 없음 → 뉴스 {news_id}")
        return

    with driver.session() as session:
        for rel in relations:
            session.execute_write(save_relation, rel, news_id)

    print(f"뉴스 {news_id}: {len(relations)}개 관계 저장 완료")

# ============================================
# 📌 전체 실행
# ============================================
def main():
    print("🚀 NEWS 관계 Import 시작!")

    files = [f for f in os.listdir(JSON_DIR) if f.endswith(".json")]
    print(f"📂 JSON 파일 감지: {len(files)}개")

    for filename in files:
        process_single_json(
            os.path.join(JSON_DIR, filename),
            filename
        )

    driver.close()
    print("✅ 모든 관계 Import 완료!")

if __name__ == "__main__":
    main()
