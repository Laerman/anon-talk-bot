ALTER TABLE t_p14838969_anon_talk_bot.messages 
ADD COLUMN video_url TEXT NULL,
ADD COLUMN voice_url TEXT NULL,
ADD COLUMN video_note_url TEXT NULL,
ADD COLUMN sticker_url TEXT NULL,
ADD COLUMN file_size BIGINT NULL,
ADD COLUMN mime_type VARCHAR(100) NULL;

CREATE INDEX idx_messages_video_url ON t_p14838969_anon_talk_bot.messages(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX idx_messages_voice_url ON t_p14838969_anon_talk_bot.messages(voice_url) WHERE voice_url IS NOT NULL;

COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.photo_url IS 'URL файла в S3 хранилище';
COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.video_url IS 'URL видео в S3 хранилище';
COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.voice_url IS 'URL голосового сообщения в S3 хранилище';
COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.video_note_url IS 'URL видеосообщения в S3 хранилище';
COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.sticker_url IS 'URL стикера в S3 хранилище';
COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN t_p14838969_anon_talk_bot.messages.mime_type IS 'MIME тип файла';