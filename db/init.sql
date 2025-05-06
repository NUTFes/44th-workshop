-- db/init.sql
-- 花火のデータを格納するテーブル
CREATE TABLE IF NOT EXISTS fireworks (
    id SERIAL PRIMARY KEY,
    is_shareable BOOLEAN NOT NULL DEFAULT FALSE,   -- 共有フラグ
    image_width INTEGER NOT NULL DEFAULT 100,      -- 画像の幅
    image_height INTEGER NOT NULL DEFAULT 100,     -- 画像の高さ
    pixel_data JSONB NOT NULL,                     -- ピクセルデータをJSONB形式で格納
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 作成日時
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 更新日時
);

-- 更新日時を自動で更新するトリガー関数
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP; -- 更新日時を現在のタイムスタンプに設定
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- fireworks テーブルの更新日時を自動で更新するトリガー
CREATE TRIGGER set_fireworks_updated_at
BEFORE UPDATE ON fireworks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();