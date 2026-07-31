-- 악보 기호(마디 메타·괄호 구간) JSON
ALTER TABLE "Score" ADD COLUMN "notation" JSONB NOT NULL DEFAULT '{}'::jsonb;
