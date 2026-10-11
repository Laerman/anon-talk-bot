import json
import time

CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}


def handler(event: dict, context) -> dict:
    """Тестовая функция с циклом: прогоняет N повторов (с паузой delay_ms между ними) и возвращает время работы."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    params = event.get('queryStringParameters') or {}
    iterations = max(1, min(int(params.get('n', 10)), 10_000_000))
    delay_ms = max(0, min(int(params.get('delay_ms', 0)), 10_000))

    started = time.time()
    total = 0
    for i in range(iterations):
        total += i
        if delay_ms:
            time.sleep(delay_ms / 1000)
    elapsed_ms = round((time.time() - started) * 1000, 2)

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({
            'ok': True,
            'iterations': iterations,
            'delay_ms': delay_ms,
            'sum': total,
            'elapsed_ms': elapsed_ms,
            'request_id': context.request_id,
        }),
    }
