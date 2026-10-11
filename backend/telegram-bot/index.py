'''
Business: Telegram webhook handler for anonymous chat bot
Args: event with httpMethod, body; context with request_id
Returns: HTTP response with statusCode 200
'''

import json
import os
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
DATABASE_URL = os.environ.get('DATABASE_URL', '')
VK_GROUP_TOKEN = os.environ.get('VK_GROUP_TOKEN', '')
VK_API_VERSION = '5.131'
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'poehali-user-files')

def send_vk_message(user_id: int, text: str, keyboard: Optional[Dict] = None) -> bool:
    """Send message to VK user"""
    import random
    url = 'https://api.vk.com/method/messages.send'
    params = {
        'user_id': user_id,
        'message': text,
        'random_id': random.randint(0, 2147483647),
        'access_token': VK_GROUP_TOKEN,
        'v': VK_API_VERSION
    }
    
    if keyboard:
        params['keyboard'] = json.dumps(keyboard)
    
    response = requests.post(url, data=params, timeout=8)
    result = response.json()
    return 'response' in result

def send_message(chat_id: int, text: str, reply_markup: Optional[Dict] = None) -> bool:
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    data = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup)
    
    response = requests.post(url, json=data, timeout=8)
    return response.status_code == 200

def send_cross_platform_message(user: Dict, text: str, keyboard: Optional[Dict] = None) -> bool:
    """Send message to user on any platform"""
    platform = user.get('platform', 'telegram')
    
    if platform == 'vk':
        vk_keyboard = None
        if keyboard and 'keyboard' in keyboard:
            vk_keyboard = {
                'buttons': [[{'action': {'type': 'text', 'label': btn['text']}} for btn in row] for row in keyboard['keyboard']]
            }
        return send_vk_message(int(user['platform_id']), text, vk_keyboard)
    else:
        return send_message(user['telegram_id'], text, keyboard)

def send_photo(chat_id: int, photo_id: str, caption: Optional[str] = None) -> bool:
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto'
    data = {'chat_id': chat_id, 'photo': photo_id}
    if caption:
        data['caption'] = caption
        data['parse_mode'] = 'HTML'
    
    response = requests.post(url, json=data, timeout=8)
    return response.status_code == 200

def send_video(chat_id: int, video_id: str, caption: Optional[str] = None) -> bool:
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendVideo'
    data = {'chat_id': chat_id, 'video': video_id}
    if caption:
        data['caption'] = caption
        data['parse_mode'] = 'HTML'
    
    response = requests.post(url, json=data, timeout=8)
    return response.status_code == 200

def send_voice(chat_id: int, voice_id: str, caption: Optional[str] = None) -> bool:
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendVoice'
    data = {'chat_id': chat_id, 'voice': voice_id}
    if caption:
        data['caption'] = caption
        data['parse_mode'] = 'HTML'
    
    response = requests.post(url, json=data, timeout=8)
    return response.status_code == 200

def send_video_note(chat_id: int, video_note_id: str) -> bool:
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendVideoNote'
    data = {'chat_id': chat_id, 'video_note': video_note_id}
    
    response = requests.post(url, json=data, timeout=8)
    return response.status_code == 200

def send_sticker(chat_id: int, sticker_id: str) -> bool:
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendSticker'
    data = {'chat_id': chat_id, 'sticker': sticker_id}
    
    response = requests.post(url, json=data, timeout=8)
    return response.status_code == 200

def get_file_url(file_id: str) -> Optional[str]:
    try:
        url = f'https://api.telegram.org/bot{BOT_TOKEN}/getFile'
        response = requests.post(url, json={"file_id": file_id}, timeout=8)
        if response.status_code == 200:
            file_path = response.json().get('result', {}).get('file_path')
            if file_path:
                return f'https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}'
        return None
    except:
        return None

def upload_file_to_s3(file_id: str, content_type: str) -> Optional[Dict[str, Any]]:
    """Upload file from Telegram to S3 storage"""
    try:
        import boto3
        import uuid
        from botocore.exceptions import ClientError
        
        telegram_file_url = get_file_url(file_id)
        if not telegram_file_url:
            return None
        
        response = requests.get(telegram_file_url, timeout=30)
        if response.status_code != 200:
            return None
        
        file_content = response.content
        
        extensions = {
            'photo': '.jpg',
            'video': '.mp4',
            'voice': '.ogg',
            'video_note': '.mp4',
            'sticker': '.webp'
        }
        file_extension = extensions.get(content_type, '.bin')
        file_name = f"attachments/{uuid.uuid4()}{file_extension}"
        
        s3_client = boto3.client('s3')
        
        mime_types = {
            'photo': 'image/jpeg',
            'video': 'video/mp4',
            'voice': 'audio/ogg',
            'video_note': 'video/mp4',
            'sticker': 'image/webp'
        }
        
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=file_name,
            Body=file_content,
            ContentType=mime_types.get(content_type, 'application/octet-stream')
        )
        
        s3_url = f"https://{S3_BUCKET_NAME}.storage.yandexcloud.net/{file_name}"
        
        return {
            'url': s3_url,
            'size': len(file_content),
            'mime_type': mime_types.get(content_type)
        }
        
    except (ClientError, Exception):
        return None

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def escape_sql(value: Any) -> str:
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    return f"'{str(value).replace(chr(39), chr(39)+chr(39))}'"

def get_or_create_user(telegram_id: int, username: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {telegram_id}")
    user = cursor.fetchone()
    
    if not user:
        username_sql = escape_sql(username)
        cursor.execute(
            f"INSERT INTO users (telegram_id, username, last_active) VALUES ({telegram_id}, {username_sql}, CURRENT_TIMESTAMP) RETURNING *"
        )
        user = cursor.fetchone()
    else:
        cursor.execute(f"UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_id = {telegram_id}")
    
    cursor.close()
    conn.close()
    return dict(user) if user else {}

def handle_start(chat_id: int, username: Optional[str]):
    user = get_or_create_user(chat_id, username)
    
    if user.get('is_blocked'):
        send_message(chat_id, '🚫 Вы заблокированы')
        return
    
    if not user.get('gender'):
        handle_set_gender(chat_id)
        return
    
    keyboard = {
        'keyboard': [
            [{'text': '🔍 Найти собеседника'}, {'text': '🎯 Найти по полу'}],
            [{'text': '⚙️ Настройки'}]
        ],
        'resize_keyboard': True
    }
    
    welcome_text = (
        '🎭 <b>Добро пожаловать в анонимный чат!</b>\n\n'
        'Здесь вы можете общаться с незнакомцами полностью анонимно.\n\n'
        '📋 <b>Команды:</b>\n'
        '🔍 Найти собеседника - случайный поиск\n'
        '🎯 Найти по полу - выбрать пол собеседника\n\n'
        '💬 <b>В диалоге:</b>\n'
        '/next - следующий собеседник\n'
        '/stop - завершить диалог\n'
        '/settings - настройки профиля'
    )
    
    send_message(chat_id, welcome_text, keyboard)

def handle_set_gender(chat_id: int):
    keyboard = {
        'keyboard': [
            [{'text': '👨 Мужской'}, {'text': '👩 Женский'}]
        ],
        'resize_keyboard': True
    }
    send_message(chat_id, '👤 Выберите ваш пол для начала:', keyboard)

def update_user_gender(telegram_id: int, gender: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    gender_sql = escape_sql(gender)
    cursor.execute(f"UPDATE users SET gender = {gender_sql} WHERE telegram_id = {telegram_id}")
    cursor.close()
    conn.close()

def get_partner_from_chat(chat_id: int) -> Optional[Dict]:
    """Get partner info with platform details from active chat"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        return None
    
    cursor.execute(f"SELECT user1_telegram_id, user2_telegram_id FROM chats WHERE id = {user['current_chat_id']} AND is_active = TRUE")
    chat_data = cursor.fetchone()
    
    if not chat_data:
        cursor.close()
        conn.close()
        return None
    
    partner_telegram_id = chat_data['user2_telegram_id'] if chat_data['user1_telegram_id'] == chat_id else chat_data['user1_telegram_id']
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {partner_telegram_id}")
    partner = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return dict(partner) if partner else None

def handle_settings(chat_id: int):
    keyboard = {
        'keyboard': [
            [{'text': '🔄 Изменить пол'}],
            [{'text': '◀️ Назад'}]
        ],
        'resize_keyboard': True
    }
    send_message(chat_id, '⚙️ Настройки:', keyboard)

def find_partner(telegram_id: int, preferred_gender: Optional[str] = None) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    query = f"SELECT * FROM users WHERE is_searching = TRUE AND telegram_id != {telegram_id} AND is_blocked = FALSE"
    
    if preferred_gender:
        gender_sql = escape_sql(preferred_gender)
        query += f" AND gender = {gender_sql}"
    
    query += " ORDER BY RANDOM() LIMIT 1"
    
    cursor.execute(query)
    partner = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return dict(partner) if partner else None

def create_chat(user1: Dict, user2: Dict) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    user1_platform = user1.get('platform', 'telegram')
    user1_platform_id = user1.get('platform_id', str(user1['telegram_id']))
    user2_platform = user2.get('platform', 'telegram')
    user2_platform_id = user2.get('platform_id', str(user2['telegram_id']))
    
    cursor.execute(f"""
        INSERT INTO chats (user1_telegram_id, user2_telegram_id, user1_platform, user1_platform_id, user2_platform, user2_platform_id) 
        VALUES ({user1['telegram_id']}, {user2['telegram_id']}, '{user1_platform}', '{user1_platform_id}', '{user2_platform}', '{user2_platform_id}') 
        RETURNING id
    """)
    chat_id = cursor.fetchone()[0]
    
    cursor.execute(f"UPDATE users SET is_searching = FALSE, is_in_chat = TRUE, current_chat_id = {chat_id} WHERE telegram_id IN ({user1['telegram_id']}, {user2['telegram_id']})")
    
    cursor.close()
    conn.close()
    return chat_id

def handle_search(chat_id: int, preferred_gender: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user:
        cursor.close()
        conn.close()
        send_message(chat_id, '❌ Ошибка. Используйте /start')
        return
    
    if user['is_blocked']:
        cursor.close()
        conn.close()
        send_message(chat_id, '🚫 Вы заблокированы')
        return
    
    if user['is_in_chat']:
        cursor.close()
        conn.close()
        send_message(chat_id, '💬 Вы уже в диалоге')
        return
    
    if not user['gender']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Сначала укажите ваш пол')
        handle_set_gender(chat_id)
        return
    
    gender_sql = escape_sql(preferred_gender)
    cursor.execute(f"UPDATE users SET last_search_gender = {gender_sql} WHERE telegram_id = {chat_id}")
    
    partner = find_partner(chat_id, preferred_gender)
    
    if partner:
        chat_db_id = create_chat(user, partner)
        
        chat_keyboard = {
            'keyboard': [
                [{'text': '❌ Завершить диалог'}],
                [{'text': '🔍 Найти нового собеседника'}]
            ],
            'resize_keyboard': True
        }
        
        platform_emoji = '📱 VK' if partner.get('platform') == 'vk' else '✈️ Telegram'
        send_message(chat_id, f'✅ Собеседник найден! ({platform_emoji})\n\nМожете начинать общение', chat_keyboard)
        
        user_platform_emoji = '✈️ Telegram'
        send_cross_platform_message(partner, f'✅ Собеседник найден! ({user_platform_emoji})\n\nМожете начинать общение', chat_keyboard)
    else:
        cursor.execute(f"UPDATE users SET is_searching = TRUE WHERE telegram_id = {chat_id}")
        search_text = '🔍 Ищем собеседника...'
        if preferred_gender:
            gender_text = '👨 мужского' if preferred_gender == 'male' else '👩 женского'
            search_text = f'🎯 Ищем собеседника {gender_text} пола...'
        
        searching_keyboard = {
            'keyboard': [
                [{'text': '❌ Отменить поиск'}]
            ],
            'resize_keyboard': True
        }
        send_message(chat_id, search_text, searching_keyboard)
    
    cursor.close()
    conn.close()

def handle_gender_search(chat_id: int):
    keyboard = {
        'keyboard': [
            [{'text': '👨 Искать мужчину'}, {'text': '👩 Искать женщину'}],
            [{'text': '◀️ Назад'}]
        ],
        'resize_keyboard': True
    }
    send_message(chat_id, '🎯 Выберите пол собеседника:', keyboard)

def handle_stop_chat(chat_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user:
        cursor.close()
        conn.close()
        return
    
    main_keyboard = {
        'keyboard': [
            [{'text': '🔍 Найти собеседника'}, {'text': '🎯 Найти по полу'}],
            [{'text': '⚙️ Настройки'}]
        ],
        'resize_keyboard': True
    }
    
    if user['is_searching']:
        cursor.execute(f"UPDATE users SET is_searching = FALSE WHERE telegram_id = {chat_id}")
        send_message(chat_id, '❌ Поиск остановлен', main_keyboard)
    elif user['is_in_chat'] and user['current_chat_id']:
        partner = get_partner_from_chat(chat_id)
        
        if partner:
            cursor.execute(f"UPDATE chats SET is_active = FALSE, ended_at = CURRENT_TIMESTAMP WHERE id = {user['current_chat_id']}")
            cursor.execute(f"UPDATE users SET is_in_chat = FALSE, current_chat_id = NULL WHERE telegram_id IN ({chat_id}, {partner['telegram_id']})")
            
            send_message(chat_id, '👋 Диалог завершён', main_keyboard)
            send_cross_platform_message(partner, '👋 Собеседник завершил диалог', main_keyboard)
    else:
        send_message(chat_id, '⚠️ Вы не в диалоге', main_keyboard)
    
    cursor.close()
    conn.close()

def handle_next_chat(chat_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user:
        cursor.close()
        conn.close()
        send_message(chat_id, '❌ Ошибка. Используйте /start')
        return
    
    if user['is_in_chat'] and user['current_chat_id']:
        partner = get_partner_from_chat(chat_id)
        
        if partner:
            cursor.execute(f"UPDATE chats SET is_active = FALSE, ended_at = CURRENT_TIMESTAMP WHERE id = {user['current_chat_id']}")
            cursor.execute(f"UPDATE users SET is_in_chat = FALSE, current_chat_id = NULL WHERE telegram_id IN ({chat_id}, {partner['telegram_id']})")
            
            send_cross_platform_message(partner, '👋 Собеседник завершил диалог')
    
    cursor.close()
    conn.close()
    
    handle_search(chat_id, user.get('last_search_gender'))

def handle_message(chat_id: int, text: str):
    partner = get_partner_from_chat(chat_id)
    
    if not partner:
        send_message(chat_id, '⚠️ Вы не в диалоге. Используйте "Найти собеседника"')
        return
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    cursor.execute(f"UPDATE chats SET message_count = message_count + 1 WHERE id = {user['current_chat_id']}")
    
    text_escaped = escape_sql(text)
    cursor.execute(f"INSERT INTO t_p14838969_anon_talk_bot.messages (chat_id, sender_telegram_id, content_type, text_content) VALUES ({user['current_chat_id']}, {chat_id}, 'text', {text_escaped})")
    
    cursor.close()
    conn.close()
    
    text_escaped = text.replace('<', '&lt;').replace('>', '&gt;')
    send_cross_platform_message(partner, text_escaped)

def handle_photo(chat_id: int, photo_id: str, caption: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Вы не в диалоге. Используйте "Найти собеседника"')
        return
    
    cursor.execute(f"SELECT user1_telegram_id, user2_telegram_id FROM chats WHERE id = {user['current_chat_id']} AND is_active = TRUE")
    chat_data = cursor.fetchone()
    
    if chat_data:
        partner_id = chat_data['user2_telegram_id'] if chat_data['user1_telegram_id'] == chat_id else chat_data['user1_telegram_id']
        
        cursor.execute(f"UPDATE chats SET message_count = message_count + 1 WHERE id = {user['current_chat_id']}")
        
        uploaded = upload_file_to_s3(photo_id, 'photo')
        if uploaded:
            photo_url_sql = escape_sql(uploaded['url'])
            file_size = uploaded.get('size', 0)
            mime_type_sql = escape_sql(uploaded.get('mime_type'))
        else:
            photo_url_sql = escape_sql(get_file_url(photo_id))
            file_size = 0
            mime_type_sql = 'NULL'
        
        caption_sql = escape_sql(caption) if caption else 'NULL'
        cursor.execute(f"INSERT INTO t_p14838969_anon_talk_bot.messages (chat_id, sender_telegram_id, content_type, photo_url, text_content, file_size, mime_type) VALUES ({user['current_chat_id']}, {chat_id}, 'photo', {photo_url_sql}, {caption_sql}, {file_size}, {mime_type_sql})")
        
        send_caption = None
        if caption:
            caption_escaped = caption.replace('<', '&lt;').replace('>', '&gt;')
            send_caption = caption_escaped
        
        send_photo(partner_id, photo_id, send_caption)
    
    cursor.close()
    conn.close()

def handle_video(chat_id: int, video_id: str, caption: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Вы не в диалоге. Используйте "Найти собеседника"')
        return
    
    cursor.execute(f"SELECT user1_telegram_id, user2_telegram_id FROM chats WHERE id = {user['current_chat_id']} AND is_active = TRUE")
    chat_data = cursor.fetchone()
    
    if chat_data:
        partner_id = chat_data['user2_telegram_id'] if chat_data['user1_telegram_id'] == chat_id else chat_data['user1_telegram_id']
        
        cursor.execute(f"UPDATE chats SET message_count = message_count + 1 WHERE id = {user['current_chat_id']}")
        
        uploaded = upload_file_to_s3(video_id, 'video')
        if uploaded:
            video_url_sql = escape_sql(uploaded['url'])
            file_size = uploaded.get('size', 0)
            mime_type_sql = escape_sql(uploaded.get('mime_type'))
        else:
            video_url_sql = escape_sql(get_file_url(video_id))
            file_size = 0
            mime_type_sql = 'NULL'
        
        caption_sql = escape_sql(caption) if caption else 'NULL'
        cursor.execute(f"INSERT INTO t_p14838969_anon_talk_bot.messages (chat_id, sender_telegram_id, content_type, video_url, text_content, file_size, mime_type) VALUES ({user['current_chat_id']}, {chat_id}, 'video', {video_url_sql}, {caption_sql}, {file_size}, {mime_type_sql})")
        
        send_caption = None
        if caption:
            caption_escaped = caption.replace('<', '&lt;').replace('>', '&gt;')
            send_caption = caption_escaped
        
        send_video(partner_id, video_id, send_caption)
    
    cursor.close()
    conn.close()

def handle_voice(chat_id: int, voice_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Вы не в диалоге. Используйте "Найти собеседника"')
        return
    
    cursor.execute(f"SELECT user1_telegram_id, user2_telegram_id FROM chats WHERE id = {user['current_chat_id']} AND is_active = TRUE")
    chat_data = cursor.fetchone()
    
    if chat_data:
        partner_id = chat_data['user2_telegram_id'] if chat_data['user1_telegram_id'] == chat_id else chat_data['user1_telegram_id']
        
        cursor.execute(f"UPDATE chats SET message_count = message_count + 1 WHERE id = {user['current_chat_id']}")
        
        uploaded = upload_file_to_s3(voice_id, 'voice')
        if uploaded:
            voice_url_sql = escape_sql(uploaded['url'])
            file_size = uploaded.get('size', 0)
            mime_type_sql = escape_sql(uploaded.get('mime_type'))
        else:
            voice_url_sql = escape_sql(get_file_url(voice_id))
            file_size = 0
            mime_type_sql = 'NULL'
        
        cursor.execute(f"INSERT INTO t_p14838969_anon_talk_bot.messages (chat_id, sender_telegram_id, content_type, voice_url, file_size, mime_type) VALUES ({user['current_chat_id']}, {chat_id}, 'voice', {voice_url_sql}, {file_size}, {mime_type_sql})")
        
        send_voice(partner_id, voice_id)
    
    cursor.close()
    conn.close()

def handle_sticker(chat_id: int, sticker_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Вы не в диалоге. Используйте "Найти собеседника"')
        return
    
    cursor.execute(f"SELECT user1_telegram_id, user2_telegram_id FROM chats WHERE id = {user['current_chat_id']} AND is_active = TRUE")
    chat_data = cursor.fetchone()
    
    if chat_data:
        partner_id = chat_data['user2_telegram_id'] if chat_data['user1_telegram_id'] == chat_id else chat_data['user1_telegram_id']
        
        cursor.execute(f"UPDATE chats SET message_count = message_count + 1 WHERE id = {user['current_chat_id']}")
        
        uploaded = upload_file_to_s3(sticker_id, 'sticker')
        if uploaded:
            sticker_url_sql = escape_sql(uploaded['url'])
            file_size = uploaded.get('size', 0)
            mime_type_sql = escape_sql(uploaded.get('mime_type'))
        else:
            sticker_url_sql = escape_sql(get_file_url(sticker_id))
            file_size = 0
            mime_type_sql = 'NULL'
        
        cursor.execute(f"INSERT INTO t_p14838969_anon_talk_bot.messages (chat_id, sender_telegram_id, content_type, sticker_url, file_size, mime_type) VALUES ({user['current_chat_id']}, {chat_id}, 'sticker', {sticker_url_sql}, {file_size}, {mime_type_sql})")
        
        send_sticker(partner_id, sticker_id)
    
    cursor.close()
    conn.close()

def handle_video_note(chat_id: int, video_note_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Вы не в диалоге. Используйте "Найти собеседника"')
        return
    
    cursor.execute(f"SELECT user1_telegram_id, user2_telegram_id FROM chats WHERE id = {user['current_chat_id']} AND is_active = TRUE")
    chat_data = cursor.fetchone()
    
    if chat_data:
        partner_id = chat_data['user2_telegram_id'] if chat_data['user1_telegram_id'] == chat_id else chat_data['user1_telegram_id']
        
        cursor.execute(f"UPDATE chats SET message_count = message_count + 1 WHERE id = {user['current_chat_id']}")
        
        uploaded = upload_file_to_s3(video_note_id, 'video_note')
        if uploaded:
            video_note_url_sql = escape_sql(uploaded['url'])
            file_size = uploaded.get('size', 0)
            mime_type_sql = escape_sql(uploaded.get('mime_type'))
        else:
            video_note_url_sql = escape_sql(get_file_url(video_note_id))
            file_size = 0
            mime_type_sql = 'NULL'
        
        cursor.execute(f"INSERT INTO t_p14838969_anon_talk_bot.messages (chat_id, sender_telegram_id, content_type, video_note_url, file_size, mime_type) VALUES ({user['current_chat_id']}, {chat_id}, 'video_note', {video_note_url_sql}, {file_size}, {mime_type_sql})")
        
        send_video_note(partner_id, video_note_id)
    
    cursor.close()
    conn.close()

def handle_complaint(chat_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(f"SELECT * FROM users WHERE telegram_id = {chat_id}")
    user = cursor.fetchone()
    
    if not user or not user['is_in_chat'] or not user['current_chat_id']:
        cursor.close()
        conn.close()
        send_message(chat_id, '⚠️ Вы не в диалоге')
        return
    
    reason_sql = escape_sql('Жалоба от пользователя')
    cursor.execute(f"INSERT INTO complaints (chat_id, reporter_telegram_id, reason) VALUES ({user['current_chat_id']}, {chat_id}, {reason_sql})")
    
    send_message(chat_id, '✅ Жалоба отправлена администрации')
    
    cursor.close()
    conn.close()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        
        if 'message' not in body:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True})
            }
        
        message = body['message']
        chat_id = message['chat']['id']
        text = message.get('text', '')
        username = message.get('from', {}).get('username')
        photo = message.get('photo')
        video = message.get('video')
        voice = message.get('voice')
        video_note = message.get('video_note')
        sticker = message.get('sticker')
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(f"SELECT is_searching FROM users WHERE telegram_id = {chat_id}")
        user_check = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user_check and user_check['is_searching']:
            if text not in ['/stop', '❌ Завершить диалог', '❌ Отменить поиск']:
                send_message(chat_id, '⏳ Идёт поиск собеседника... Используйте "❌ Отменить поиск" для отмены')
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True})
                }
        
        if photo:
            largest_photo = photo[-1]
            photo_id = largest_photo['file_id']
            caption = message.get('caption')
            handle_photo(chat_id, photo_id, caption)
        elif video:
            video_id = video['file_id']
            caption = message.get('caption')
            handle_video(chat_id, video_id, caption)
        elif voice:
            voice_id = voice['file_id']
            handle_voice(chat_id, voice_id)
        elif video_note:
            video_note_id = video_note['file_id']
            handle_video_note(chat_id, video_note_id)
        elif sticker:
            sticker_id = sticker['file_id']
            handle_sticker(chat_id, sticker_id)
        elif text == '/start':
            handle_start(chat_id, username)
        elif text == '/stop':
            handle_stop_chat(chat_id)
        elif text == '/next':
            handle_next_chat(chat_id)
        elif text == '/settings':
            handle_settings(chat_id)
        elif text == '⚙️ Настройки':
            handle_settings(chat_id)
        elif text == '◀️ Назад':
            handle_start(chat_id, username)
        elif text == '🔄 Изменить пол':
            handle_set_gender(chat_id)
        elif text == '👨 Мужской':
            update_user_gender(chat_id, 'male')
            send_message(chat_id, '✅ Пол установлен: Мужской')
            handle_start(chat_id, username)
        elif text == '👩 Женский':
            update_user_gender(chat_id, 'female')
            send_message(chat_id, '✅ Пол установлен: Женский')
            handle_start(chat_id, username)
        elif text == '🔍 Найти собеседника':
            handle_search(chat_id)
        elif text == '🎯 Найти по полу':
            handle_gender_search(chat_id)
        elif text == '👨 Искать мужчину':
            handle_search(chat_id, 'male')
        elif text == '👩 Искать женщину':
            handle_search(chat_id, 'female')
        elif text == '❌ Завершить диалог':
            handle_stop_chat(chat_id)
        elif text == '❌ Отменить поиск':
            handle_stop_chat(chat_id)
        elif text == '⚠️ Пожаловаться':
            handle_complaint(chat_id)
        elif text == '🔍 Найти нового собеседника':
            handle_next_chat(chat_id)
        else:
            handle_message(chat_id, text)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True})
        }
    
    except Exception as e:
        import traceback
        error_details = {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': traceback.format_exc()
        }
        print(f"ERROR: {json.dumps(error_details)}")
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True})
        }
