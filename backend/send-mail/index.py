import json
import os
import html
import urllib.request
import urllib.error

MAIL_TO = 'ptizaforest.89@gmail.com'
API_URL = 'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
}


def reply(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False),
        'isBase64Encoded': False
    }


def handler(event: dict, context) -> dict:
    '''Отправляет заявку с формы сайта на почту ptizaforest.89@gmail.com через Unisender Go'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'POST':
        return reply(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')
    name = str(body.get('name', '')).strip()[:100]
    contact = str(body.get('contact', '')).strip()[:150]
    message = str(body.get('message', '')).strip()[:5000]

    if not name or not message:
        return reply(400, {'success': False, 'error': 'Заполните имя и сообщение'})

    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    if not api_key or not sender:
        return reply(500, {'success': False, 'error': 'Отправка почты не настроена'})

    body_html = (
        f'<p><b>Имя:</b> {html.escape(name)}</p>'
        f'<p><b>Контакт:</b> {html.escape(contact) or "—"}</p>'
        f'<p><b>Сообщение:</b><br>{html.escape(message).replace(chr(10), "<br>")}</p>'
    )
    msg = {
        'recipients': [{'email': MAIL_TO}],
        'from_email': sender,
        'from_name': 'Форма с сайта',
        'subject': f'Заявка с сайта от {name}',
        'body': {'html': body_html, 'plaintext': f'Имя: {name}\nКонтакт: {contact}\n\n{message}'},
        'track_links': 0,
        'track_read': 0,
    }
    if '@' in contact:
        msg['reply_to'] = contact

    req = urllib.request.Request(
        API_URL,
        data=json.dumps({'message': msg}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'X-API-KEY': api_key},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            result = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'Unisender HTTP {e.code}: {e.read().decode("utf-8", "replace")[:500]}')
        return reply(502, {'success': False, 'error': 'Не удалось отправить письмо, попробуйте позже'})
    except Exception as e:
        print(f'Unisender error: {type(e).__name__}: {e}')
        return reply(502, {'success': False, 'error': 'Не удалось отправить письмо, попробуйте позже'})

    if result.get('status') != 'success':
        print(f'Unisender rejected: {result}')
        return reply(502, {'success': False, 'error': 'Не удалось отправить письмо, попробуйте позже'})

    return reply(200, {'success': True, 'message': 'Письмо отправлено'})
