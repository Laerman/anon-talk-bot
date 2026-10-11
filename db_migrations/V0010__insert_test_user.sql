INSERT INTO t_p14838969_anon_talk_bot.users (telegram_id, username, gender, platform, platform_id)
SELECT 999999999, 'test_user', 'not_set', 'telegram', '999999999'
WHERE NOT EXISTS (SELECT 1 FROM t_p14838969_anon_talk_bot.users WHERE telegram_id = 999999999);