import json
import urllib.request
import urllib.parse
import urllib.error

BASE = 'https://telelog.info/api/v1'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Content-Type': 'application/json',
}


def api_get(url: str, token: str, timeout: int = 25):
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'User-Agent': 'telelog-web/1.0',
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', 'replace')
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {'raw': raw[:500]}
        return e.code, parsed


def handler(event: dict, context) -> dict:
    """Прокси к telelog.info API: резолв @username в ID и получение групп юзера."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    if method != 'POST':
        return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    token = (body.get('token') or '').strip()
    action = body.get('action') or 'groups'

    if not token:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не указан токен'})}

    if action == 'resolve':
        names = [str(n).lstrip('@') for n in (body.get('names') or []) if str(n).strip()]
        if not names:
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True, 'data': []})}
        qs = urllib.parse.urlencode([('name', n) for n in names])
        status, data = api_get(f'{BASE}/users/resolve_username?{qs}', token)
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'success': status == 200, 'status': status, 'data': data}, ensure_ascii=False)}

    user_id = str(body.get('userId') or '').strip()
    if not user_id.isdigit():
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Некорректный userId'})}

    status, data = api_get(f'{BASE}/users/{user_id}/groups', token)
    return {'statusCode': 200, 'headers': CORS,
            'body': json.dumps({'success': status == 200, 'status': status, 'data': data}, ensure_ascii=False)}
