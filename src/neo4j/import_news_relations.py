# src/neo4j/import_news_relations.py
import os
import json
from neo4j import GraphDatabase
from dotenv import load_dotenv

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
# 🔍 기존 관계가 이미 존재하는지 체크
# ============================================
def relation_exists(tx, source, target, news_id):
    result = tx.run(
        """
        MATCH (s:Entity {name: $source})-[r:RELATION {news_id: $news_id}]->(t:Entity {name: $target})
        RETURN r LIMIT 1
        """,
        source=source,
        target=target,
        news_id=news_id,
    )
    return result.single() is not None

# ============================================
# 🔥 관계 + 노드 속성 저장
# ============================================
def save_relation(tx, rel, news_id):

    source = rel["source"]
    target = rel["target"]

    rel_type = rel["relation_type"]
    reason = rel["relation_reason"]

    # source node props
    source_props = {
        "is_listed": rel.get("source_is_listed"),
        "country": rel.get("source_country"),
        "ticker": rel.get("source_ticker"),
    }

    # target node props
    target_props = {
        "is_listed": rel.get("target_is_listed"),
        "country": rel.get("target_country"),
        "ticker": rel.get("target_ticker"),
    }

    # --------------------------
    # 중복 방지
    # --------------------------
    if relation_exists(tx, source, target, news_id):
        print(f"이미 존재 → {source} -> {target} (news {news_id})")
        return

    # --------------------------
    # 저장 (extra_json 제거!!)
    # --------------------------
    tx.run(
        """
        MERGE (s:Entity {name: $source})
        SET  s.is_listed = $s_is_listed,
             s.country = $s_country,
             s.ticker = $s_ticker

        MERGE (t:Entity {name: $target})
        SET  t.is_listed = $t_is_listed,
             t.country = $t_country,
             t.ticker = $t_ticker

        MERGE (s)-[r:RELATION {news_id: $news_id}]->(t)
        SET  r.rel_type = $rel_type,
             r.rel_reason = $reason,
             r.event_tag = "NEWS"
        """,
        source=source,
        target=target,
        s_is_listed=source_props["is_listed"],
        s_country=source_props["country"],
        s_ticker=source_props["ticker"],
        t_is_listed=target_props["is_listed"],
        t_country=target_props["country"],
        t_ticker=target_props["ticker"],
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

    print(f"뉴스 {news_id}: {len(relations)}개 저장 완료")

# ============================================
# 📌 전체 수행
# ============================================
def main():
    print("NEWS 관계 Import 시작!")

    files = [f for f in os.listdir(JSON_DIR) if f.endswith(".json")]
    print(f"JSON 파일 감지: {len(files)}개")

    for filename in files:
        process_single_json(os.path.join(JSON_DIR, filename), filename)

    print("모든 관계 Import 완료!")
    driver.close()


if __name__ == "__main__":
    main()
