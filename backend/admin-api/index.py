'''
Business: Admin API for getting stats, active chats, complaints, attachments
Args: event with httpMethod, queryStringParameters; context with request_id
Returns: JSON with statistics, chats, complaints or attachments
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def get_stats() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE last_active > NOW() - INTERVAL '5 minutes'")
    active_users = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM chats WHERE is_active = TRUE")
    active_chats = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_searching = TRUE")
    searching_users = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM complaints WHERE status = 'pending'")
    pending_complaints = cursor.fetchone()['total']
    
    cursor.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE gender = 'male') as male_count,
            COUNT(*) FILTER (WHERE gender = 'female') as female_count
        FROM users 
        WHERE last_active > NOW() - INTERVAL '24 hours'
    """)
    gender_stats = cursor.fetchone()
    
    cursor.execute("""
        SELECT 
            EXTRACT(HOUR FROM started_at) as hour,
            COUNT(*) as count
        FROM chats
        WHERE started_at > NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM started_at)
        ORDER BY hour
    """)
    hourly_stats = cursor.fetchall()
    
    cursor.execute("""
        SELECT 
            AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60) as avg_duration_minutes
        FROM chats
        WHERE started_at > NOW() - INTERVAL '24 hours'
    """)
    avg_duration = float(cursor.fetchone()['avg_duration_minutes'] or 0)
    
    cursor.execute("""
        SELECT SUM(message_count) as total_messages
        FROM chats
        WHERE started_at > NOW() - INTERVAL '24 hours'
    """)
    total_messages = int(cursor.fetchone()['total_messages'] or 0)
    
    cursor.close()
    conn.close()
    
    return {
        'active_users': active_users,
        'active_chats': active_chats,
        'searching_users': searching_users,
        'pending_complaints': pending_complaints,
        'gender_distribution': {
            'male': gender_stats['male_count'] or 0,
            'female': gender_stats['female_count'] or 0
        },
        'hourly_stats': [{'hour': int(row['hour']), 'users': int(row['count']), 'chats': int(row['count'])} for row in hourly_stats],
        'avg_chat_duration_minutes': round(float(avg_duration), 2),
        'total_messages_today': total_messages
    }

def get_active_chats() -> list:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("""
        SELECT 
            c.id,
            c.started_at,
            c.message_count,
            u1.gender as user1_gender,
            u2.gender as user2_gender,
            EXTRACT(EPOCH FROM (NOW() - c.started_at)) / 60 as duration_minutes
        FROM chats c
        JOIN users u1 ON c.user1_telegram_id = u1.telegram_id
        JOIN users u2 ON c.user2_telegram_id = u2.telegram_id
        WHERE c.is_active = TRUE
        ORDER BY c.started_at DESC
        LIMIT 50
    """)
    
    chats = cursor.fetchall()
    cursor.close()
    conn.close()
    
    result = []
    for chat in chats:
        result.append({
            'id': int(chat['id']),
            'user1_gender': chat['user1_gender'] or 'unknown',
            'user2_gender': chat['user2_gender'] or 'unknown',
            'message_count': int(chat['message_count']),
            'duration_minutes': float(chat['duration_minutes'])
        })
    
    return {'chats': result}

def get_complaints() -> list:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("""
        SELECT 
            c.id,
            c.chat_id,
            c.reporter_telegram_id,
            c.reason,
            c.status,
            c.created_at,
            ch.user1_telegram_id,
            ch.user2_telegram_id
        FROM complaints c
        LEFT JOIN chats ch ON ch.id = c.chat_id
        ORDER BY c.created_at DESC
        LIMIT 50
    """)
    
    complaints = cursor.fetchall()
    cursor.close()
    conn.close()
    
    result = []
    for complaint in complaints:
        reported_user_id = None
        if complaint['user1_telegram_id'] and complaint['user2_telegram_id']:
            if complaint['reporter_telegram_id'] == complaint['user1_telegram_id']:
                reported_user_id = complaint['user2_telegram_id']
            else:
                reported_user_id = complaint['user1_telegram_id']
        
        result.append({
            'id': complaint['id'],
            'chat_id': complaint['chat_id'],
            'reported_user_id': reported_user_id,
            'reason': complaint['reason'],
            'status': complaint['status'],
            'created_at': complaint['created_at'].isoformat()
        })
    
    return {'complaints': result}

def cleanup_old_attachments() -> int:
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
    
    return deleted_count

def get_attachments() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cleanup_old_attachments()
    
    cursor.execute("""
        SELECT 
            m.id,
            m.chat_id,
            m.photo_url,
            m.content_type,
            m.sent_at,
            u.gender as sender_gender
        FROM t_p14838969_anon_talk_bot.messages m
        JOIN t_p14838969_anon_talk_bot.users u ON m.sender_telegram_id = u.telegram_id
        WHERE m.photo_url IS NOT NULL
        AND m.sent_at >= NOW() - INTERVAL '24 hours'
        ORDER BY m.sent_at DESC
        LIMIT 100
    """)
    
    attachments = cursor.fetchall()
    cursor.close()
    conn.close()
    
    result = []
    for att in attachments:
        result.append({
            'id': int(att['id']),
            'chat_id': int(att['chat_id']),
            'photo_url': att['photo_url'],
            'content_type': att['content_type'],
            'sent_at': att['sent_at'].isoformat(),
            'sender_gender': att['sender_gender'] or 'unknown'
        })
    
    return {'attachments': result}

def block_user(telegram_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(f"UPDATE users SET is_blocked = TRUE WHERE telegram_id = {telegram_id}")
    
    cursor.execute(f"""
        UPDATE chats 
        SET is_active = FALSE, ended_at = CURRENT_TIMESTAMP 
        WHERE (user1_telegram_id = {telegram_id} OR user2_telegram_id = {telegram_id}) 
        AND is_active = TRUE
    """)
    
    cursor.execute(f"UPDATE users SET is_in_chat = FALSE, current_chat_id = NULL WHERE telegram_id = {telegram_id}")
    
    cursor.close()
    conn.close()
    
    return True

def resolve_complaint(complaint_id: int, status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    status_escaped = status.replace("'", "''")
    cursor.execute(f"UPDATE complaints SET status = '{status_escaped}' WHERE id = {complaint_id}")
    
    cursor.close()
    conn.close()
    
    return True

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
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            endpoint = params.get('endpoint', 'stats')
            
            if endpoint == 'stats':
                data = get_stats()
            elif endpoint == 'chats':
                data = get_active_chats()
            elif endpoint == 'complaints':
                data = get_complaints()
            elif endpoint == 'attachments':
                data = get_attachments()
            else:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid endpoint'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(data)
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'block_user':
                telegram_id = body.get('telegram_id')
                if not telegram_id:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'telegram_id required'})
                    }
                
                block_user(telegram_id)
                
                complaint_id = body.get('complaint_id')
                if complaint_id:
                    resolve_complaint(complaint_id, 'resolved')
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'resolve_complaint':
                complaint_id = body.get('complaint_id')
                status = body.get('status', 'resolved')
                
                if not complaint_id:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'complaint_id required'})
                    }
                
                resolve_complaint(complaint_id, status)
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'success': True})
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid action'})
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed'})
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
