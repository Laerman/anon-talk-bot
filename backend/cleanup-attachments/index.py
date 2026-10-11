'''
Business: Cleanup old attachments older than 24 hours
Args: event with httpMethod; context with request_id
Returns: JSON with cleanup statistics
'''

import json
import os
from typing import Dict, Any
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def cleanup_old_attachments() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE t_p14838969_anon_talk_bot.messages
        SET photo_url = NULL
        WHERE photo_url IS NOT NULL 
        AND sent_at < NOW() - INTERVAL '24 hours'
    """)
    
    deleted_count = cursor.rowcount
    
    cursor.close()
    conn.close()
    
    return {
        'deleted_count': deleted_count,
        'timestamp': 'NOW()'
    }

def delete_all_attachments() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE t_p14838969_anon_talk_bot.messages
        SET photo_url = NULL
        WHERE photo_url IS NOT NULL
    """)
    
    deleted_count = cursor.rowcount
    
    cursor.close()
    conn.close()
    
    return {
        'deleted_count': deleted_count,
        'timestamp': 'NOW()'
    }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        body_str = event.get('body', '')
        body = json.loads(body_str) if body_str else {}
        delete_all = body.get('delete_all', False)
        
        if delete_all:
            result = delete_all_attachments()
        else:
            result = cleanup_old_attachments()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
