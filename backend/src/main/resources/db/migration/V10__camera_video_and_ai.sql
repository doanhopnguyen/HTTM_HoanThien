ALTER TABLE cameras ADD COLUMN ai_model varchar(30) NOT NULL DEFAULT 'NONE';
ALTER TABLE cameras ADD COLUMN model_asset varchar(100);
ALTER TABLE cameras ADD COLUMN ai_confidence double precision NOT NULL DEFAULT 0.5;
ALTER TABLE cameras ADD CONSTRAINT cameras_ai_model CHECK (ai_model IN ('NONE','YOLO26N','ULTRALYTICS','REFERENCE'));
ALTER TABLE cameras ADD CONSTRAINT cameras_ai_confidence CHECK (ai_confidence >= 0.05 AND ai_confidence <= 1);
