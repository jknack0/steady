#!/usr/bin/env python3
"""Sync missing parts from Railway prod to AWS RDS for kevin.barr's programs."""
import subprocess, json, sys, os

PROD_URL = "postgresql://postgres:ZiDWjlqoPkQGXBSXvIfLyTmiJcMxZGMP@shortline.proxy.rlwy.net:37864/railway"
RDS_HOST = "steady-db.cx28s2yuw4sb.us-east-2.rds.amazonaws.com"
RDS_PASS = os.environ.get("RDS_PASS", '5#w3<?yQlG?*AX_vQ:i)y|KfHaSW')
PSQL = "/usr/lib/postgresql/18/bin/psql"

def query_json(connstr, sql):
    # Write SQL to temp file to avoid shell quoting issues
    tmp = "/tmp/_q.sql"
    with open(tmp, "w") as f:
        f.write(sql)
    cmd = [PSQL, connstr, "-t", "-A", "-f", tmp]
    r = subprocess.run(cmd, capture_output=True, text=True)
    rows = []
    for line in r.stdout.strip().split("\n"):
        if line:
            try:
                rows.append(json.loads(line))
            except:
                pass
    return rows

def query_json_rds(sql):
    tmp = "/tmp/_q.sql"
    with open(tmp, "w") as f:
        f.write(sql)
    cmd = [PSQL, "-h", RDS_HOST, "-U", "postgres", "-d", "steady-db", "-t", "-A", "-f", tmp]
    env = {**os.environ, "PGPASSWORD": RDS_PASS}
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    rows = []
    for line in r.stdout.strip().split("\n"):
        if line:
            try:
                rows.append(json.loads(line))
            except:
                pass
    return rows

def exec_rds(sql):
    tmp = "/tmp/_q.sql"
    with open(tmp, "w") as f:
        f.write(sql)
    cmd = [PSQL, "-h", RDS_HOST, "-U", "postgres", "-d", "steady-db", "-f", tmp]
    env = {**os.environ, "PGPASSWORD": RDS_PASS}
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        print(f"  SQL ERROR: {r.stderr.strip()}", file=sys.stderr)
    return r.returncode == 0

programs = [
    "ACT for Depression and Anxiety",
    "SFBT for Anxiety and Depression",
    "Steady with ADHD",
]

for prog_title in programs:
    print(f"\n=== {prog_title} ===")

    # Get prod parts
    prod_parts = query_json(PROD_URL, f"""
        SELECT row_to_json(t) FROM (
            SELECT pt.id, pt.type, pt.title, pt.instructions, pt.content,
                   pt."sortOrder", m."sortOrder" as mod_sort, m.title as mod_title
            FROM parts pt
            JOIN modules m ON m.id = pt."moduleId"
            JOIN programs p ON p.id = m."programId"
            JOIN clinician_profiles cp ON cp.id = p."clinicianId"
            JOIN users u ON u.id = cp."userId"
            WHERE u.email = 'kevin.barr@steady.com'
              AND p.title = '{prog_title}'
              AND p.status != 'ARCHIVED'
              AND p."isTemplate" = false
            ORDER BY m."sortOrder", pt."sortOrder"
        ) t;
    """)
    print(f"  Prod parts: {len(prod_parts)}")

    # Get RDS module ID mapping by sortOrder
    rds_mod_rows = query_json_rds(f"""
        SELECT row_to_json(t) FROM (
            SELECT m.id, m."sortOrder" as mod_sort, m.title
            FROM modules m
            JOIN programs p ON p.id = m."programId"
            JOIN clinician_profiles cp ON cp.id = p."clinicianId"
            JOIN users u ON u.id = cp."userId"
            WHERE u.email = 'kevin.barr@steady.com'
              AND p.title = '{prog_title}'
            ORDER BY m."sortOrder"
        ) t;
    """)
    rds_modules = {}
    for rm in rds_mod_rows:
        rds_modules[rm["mod_sort"]] = rm["id"]
    print(f"  RDS modules: {len(rds_modules)}")

    # Get existing RDS parts to avoid duplicates
    rds_existing_rows = query_json_rds(f"""
        SELECT row_to_json(t) FROM (
            SELECT m."sortOrder" as mod_sort, pt."sortOrder" as part_sort
            FROM parts pt
            JOIN modules m ON m.id = pt."moduleId"
            JOIN programs p ON p.id = m."programId"
            JOIN clinician_profiles cp ON cp.id = p."clinicianId"
            JOIN users u ON u.id = cp."userId"
            WHERE u.email = 'kevin.barr@steady.com'
              AND p.title = '{prog_title}'
        ) t;
    """)
    rds_existing = set()
    for re in rds_existing_rows:
        rds_existing.add((re["mod_sort"], re["part_sort"]))
    print(f"  RDS existing parts: {len(rds_existing)}")

    inserted = 0
    skipped = 0
    for part in prod_parts:
        key = (part["mod_sort"], part["sortOrder"])
        if key in rds_existing:
            skipped += 1
            continue

        rds_mod_id = rds_modules.get(part["mod_sort"])
        if not rds_mod_id:
            print(f"  SKIP: No RDS module for mod_sort={part['mod_sort']} ({part.get('mod_title', '?')})")
            continue

        new_id = f"sync_{part['id'][-20:]}"
        title_esc = (part.get("title") or "").replace("'", "''")
        instr_esc = (part.get("instructions") or "").replace("'", "''")
        content_json = json.dumps(part.get("content") or {}).replace("'", "''")
        part_type = part["type"]
        sort_order = part["sortOrder"]

        sql = f"""INSERT INTO parts (id, "moduleId", type, title, instructions, content, "sortOrder", "createdAt", "updatedAt")
VALUES ('{new_id}', '{rds_mod_id}', '{part_type}', '{title_esc}', '{instr_esc}', '{content_json}'::jsonb, {sort_order}, NOW(), NOW())
ON CONFLICT DO NOTHING;"""

        if exec_rds(sql):
            inserted += 1
        else:
            print(f"  FAILED: mod_sort={part['mod_sort']} part_sort={sort_order}")

    print(f"  Result: {inserted} inserted, {skipped} skipped (already existed)")

print("\n=== Done! ===")
