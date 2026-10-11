'''
Business: Admin authentication API with brute-force protection
Args: event with httpMethod, body, headers; context with request_id
Returns: HTTP response with session token or error
'''

import json
import os
import secrets
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt

DATABASE_URL = os.environ.get('DATABASE_URL', '')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', '')

MAX_ATTEMPTS = 5
ATTEMPT_WINDOW_MINUTES = 15
SESSION_DURATION_HOURS = 24

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

def get_client_ip(event: Dict[str, Any]) -> str:
    headers = event.get('headers', {})
    return headers.get('x-forwarded-for', headers.get('x-real-ip', 'unknown')).split(',')[0].strip()

def check_rate_limit(ip_address: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    time_threshold = datetime.now() - timedelta(minutes=ATTEMPT_WINDOW_MINUTES)
    time_sql = escape_sql(time_threshold.isoformat())
    ip_sql = escape_sql(ip_address)
    
    cursor.execute(
        f"SELECT COUNT(*) as count FROM login_attempts "
        f"WHERE ip_address = {ip_sql} AND attempted_at > {time_sql}"
    )
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return result[0] < MAX_ATTEMPTS

def log_attempt(ip_address: str, success: bool):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    ip_sql = escape_sql(ip_address)
    success_sql = 'TRUE' if success else 'FALSE'
    
    cursor.execute(
        f"INSERT INTO login_attempts (ip_address, success) VALUES ({ip_sql}, {success_sql})"
    )
    
    cursor.close()
    conn.close()

def verify_password(password: str) -> bool:
    if not ADMIN_PASSWORD_HASH:
        return False
    return bcrypt.checkpw(password.encode('utf-8'), ADMIN_PASSWORD_HASH.encode('utf-8'))

def create_session(ip_address: str, user_agent: str) -> str:
    session_token = secrets.token_urlsafe(48)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    expires_at = datetime.now() + timedelta(hours=SESSION_DURATION_HOURS)
    
    token_sql = escape_sql(session_token)
    ip_sql = escape_sql(ip_address)
    ua_sql = escape_sql(user_agent)
    expires_sql = escape_sql(expires_at.isoformat())
    
    cursor.execute(
        f"INSERT INTO admin_sessions (session_token, ip_address, user_agent, expires_at) "
        f"VALUES ({token_sql}, {ip_sql}, {ua_sql}, {expires_sql})"
    )
    
    cursor.close()
    conn.close()
    
    return session_token

def verify_session(session_token: str, ip_address: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    token_sql = escape_sql(session_token)
    
    cursor.execute(
        f"SELECT * FROM admin_sessions "
        f"WHERE session_token = {token_sql} AND is_active = TRUE"
    )
    session = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not session:
        return False
    
    if datetime.now() > session['expires_at']:
        return False
    
    return True

def logout_session(session_token: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    token_sql = escape_sql(session_token)
    cursor.execute(f"UPDATE admin_sessions SET is_active = FALSE WHERE session_token = {token_sql}")
    
    cursor.close()
    conn.close()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    method = event.get('httpMethod', 'POST')
    ip_address = get_client_ip(event)
    
    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action', 'login')
            
            if action == 'login':
                password = body.get('password', '')
                
                if not check_rate_limit(ip_address):
                    return {
                        'statusCode': 429,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'error': 'Слишком много попыток входа. Попробуйте через 15 минут'
                        })
                    }
                
                if verify_password(password):
                    log_attempt(ip_address, True)
                    user_agent = event.get('headers', {}).get('user-agent', 'unknown')
                    session_token = create_session(ip_address, user_agent)
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'success': True,
                            'session_token': session_token
                        })
                    }
                else:
                    log_attempt(ip_address, False)
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'error': 'Неверный пароль'
                        })
                    }
            
            elif action == 'verify':
                session_token = body.get('session_token', '')
                
                if verify_session(session_token, ip_address):
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'valid': True})
                    }
                else:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'valid': False})
                    }
            
            elif action == 'logout':
                session_token = body.get('session_token', '')
                logout_session(session_token)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

