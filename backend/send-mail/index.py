import json
import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = 'mail.hosting.reg.ru'
SMTP_PORT = 465
SMTP_USER = '123@svoikit.online'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
}


def handler(event: dict, context) -> dict:
    '''Отправляет письмо с сайта на почту 123@svoikit.online через SMTP Рег.ру'''
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
    msg['To'] = SMTP_USER
    msg.set_content(f'Имя: {name}\nКонтакт: {contact}\n\nСообщение:\n{message}')

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.login(SMTP_USER, password)
        server.send_message(msg)

    return {
        'statusCode': 200,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps({'success': True, 'message': 'Письмо отправлено'}),
        'isBase64Encoded': False
    }
