import json
import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = 'mail.hosting.reg.ru'
SMTP_PORT = 465
SMTP_USER = '123@svoikit.online'
MAIL_TO = 'ptizaforest.89@gmail.com'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
}


def handler(event: dict, context) -> dict:
    '''Отправляет письмо с сайта на почту ptizaforest.89@gmail.com через SMTP Рег.ру'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }

    body = json.loads(event.get('body') or '{}')
    name = str(body.get('name', '')).strip()
    contact = str(body.get('contact', '')).strip()
    message = str(body.get('message', '')).strip()

    if not name or not message:
        return {
            'statusCode': 400,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'success': False, 'error': 'Заполните имя и сообщение'}),
            'isBase64Encoded': False
        }

    password = os.environ.get('SMTP_PASSWORD')
    if not password:
        return {
            'statusCode': 500,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'success': False, 'error': 'SMTP не настроен'}),
            'isBase64Encoded': False
        }

    msg = EmailMessage()
    msg['Subject'] = f'Заявка с сайта от {name}'
    msg['From'] = SMTP_USER
    msg['To'] = MAIL_TO
    if '@' in contact:
        msg['Reply-To'] = contact
    msg.set_content(f'Имя: {name}\nКонтакт: {contact}\n\nСообщение:\n{message}')

    import time
    started = time.time()
    stage = 'connect'
    try:
        try:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=2)
        except (TimeoutError, OSError) as e:
            print(f'Port {SMTP_PORT} failed: {e}; trying 587')
            stage = 'connect587'
            server = smtplib.SMTP(SMTP_HOST, 587, timeout=2)
            server.starttls()
        with server:
            stage = 'login'
            server.login(SMTP_USER, password)
            stage = 'send'
            server.send_message(msg)
    except Exception as e:
        print(f'SMTP error at {stage} after {time.time() - started:.2f}s: {type(e).__name__}: {e}')
        return {
            'statusCode': 502,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'success': False, 'error': 'Не удалось отправить письмо, попробуйте позже', 'stage': stage}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    print(f'SMTP ok in {time.time() - started:.2f}s')

    return {
        'statusCode': 200,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps({'success': True, 'message': 'Письмо отправлено'}),
        'isBase64Encoded': False
    }

