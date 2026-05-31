ALTER TABLE "AccountGroup" ADD COLUMN "isCashAccount" BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE
  invalid_count integer;
BEGIN
  WITH RECURSIVE cash_ancestor_groups AS (
    SELECT g."id", g."accountBookId", g."parentGroupId", g."type"
    FROM "Account" a
    JOIN "AccountGroup" g
      ON g."id" = a."groupId"
     AND g."accountBookId" = a."accountBookId"
    WHERE a."isCashAccount" = true

    UNION

    SELECT parent."id", parent."accountBookId", parent."parentGroupId", parent."type"
    FROM cash_ancestor_groups child
    JOIN "AccountGroup" parent
      ON parent."id" = child."parentGroupId"
     AND parent."accountBookId" = child."accountBookId"
  ),
  cash_subtree_groups AS (
    SELECT "id", "accountBookId", "parentGroupId", "type"
    FROM cash_ancestor_groups

    UNION

    SELECT child."id", child."accountBookId", child."parentGroupId", child."type"
    FROM cash_subtree_groups parent
    JOIN "AccountGroup" child
      ON child."parentGroupId" = parent."id"
     AND child."accountBookId" = parent."accountBookId"
  ),
  invalid_groups AS (
    SELECT 1
    FROM cash_subtree_groups
    WHERE "type" <> 'ASSET'
  ),
  invalid_accounts AS (
    SELECT 1
    FROM cash_subtree_groups g
    JOIN "Account" a
      ON a."groupId" = g."id"
     AND a."accountBookId" = g."accountBookId"
    WHERE a."type" <> 'ASSET'
       OR a."unit" <> 'CURRENCY'
  )
  SELECT count(*) INTO invalid_count
  FROM (
    SELECT * FROM invalid_groups
    UNION ALL
    SELECT * FROM invalid_accounts
  ) invalid_cash_descendants;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot add group-level cash accounts because existing cash account groups contain non-cashable descendants.';
  END IF;
END $$;

WITH RECURSIVE cash_ancestor_groups AS (
  SELECT g."id", g."accountBookId", g."parentGroupId"
  FROM "Account" a
  JOIN "AccountGroup" g
    ON g."id" = a."groupId"
   AND g."accountBookId" = a."accountBookId"
  WHERE a."isCashAccount" = true

  UNION

  SELECT parent."id", parent."accountBookId", parent."parentGroupId"
  FROM cash_ancestor_groups child
  JOIN "AccountGroup" parent
    ON parent."id" = child."parentGroupId"
   AND parent."accountBookId" = child."accountBookId"
),
cash_subtree_groups AS (
  SELECT "id", "accountBookId"
  FROM cash_ancestor_groups

  UNION

  SELECT child."id", child."accountBookId"
  FROM cash_subtree_groups parent
  JOIN "AccountGroup" child
    ON child."parentGroupId" = parent."id"
   AND child."accountBookId" = parent."accountBookId"
)
UPDATE "AccountGroup" g
SET "isCashAccount" = true
FROM cash_subtree_groups cash_group
WHERE g."id" = cash_group."id"
  AND g."accountBookId" = cash_group."accountBookId";

WITH RECURSIVE cash_ancestor_groups AS (
  SELECT g."id", g."accountBookId", g."parentGroupId"
  FROM "Account" a
  JOIN "AccountGroup" g
    ON g."id" = a."groupId"
   AND g."accountBookId" = a."accountBookId"
  WHERE a."isCashAccount" = true

  UNION

  SELECT parent."id", parent."accountBookId", parent."parentGroupId"
  FROM cash_ancestor_groups child
  JOIN "AccountGroup" parent
    ON parent."id" = child."parentGroupId"
   AND parent."accountBookId" = child."accountBookId"
),
cash_subtree_groups AS (
  SELECT "id", "accountBookId"
  FROM cash_ancestor_groups

  UNION

  SELECT child."id", child."accountBookId"
  FROM cash_subtree_groups parent
  JOIN "AccountGroup" child
    ON child."parentGroupId" = parent."id"
   AND child."accountBookId" = parent."accountBookId"
)
UPDATE "Account" a
SET "isCashAccount" = true
FROM cash_subtree_groups cash_group
WHERE a."groupId" = cash_group."id"
  AND a."accountBookId" = cash_group."accountBookId";
