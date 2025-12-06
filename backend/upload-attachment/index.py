'''
Business: Загружает файлы вложений от Telegram в S3 хранилище
Args: event с httpMethod, body (file_id, content_type); context с request_id
Returns: HTTP response с URL загруженного файла в S3
'''

import json
import os
import requests
import uuid
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'poehali-user-files')

class UploadRequest(BaseModel):
    file_id: str = Field(..., min_length=1)
    content_type: str = Field(..., pattern='^(photo|video|voice|video_note|sticker|document)$')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загружает файлы вложений от Telegram в S3 хранилище
    Args: event с httpMethod, body; context с request_id
    Returns: HTTP response с URL загруженного файла
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        upload_req = UploadRequest(**body_data)
        
        telegram_file_url = get_telegram_file_url(upload_req.file_id)
        if not telegram_file_url:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to get file from Telegram'})
            }
        
        file_content = download_file(telegram_file_url)
        if not file_content:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to download file'})
            }
        
        file_extension = get_file_extension(upload_req.content_type)
        file_name = f"attachments/{uuid.uuid4()}{file_extension}"
        s3_url = upload_to_s3(file_content, file_name, upload_req.content_type)
        
        if not s3_url:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to upload to S3'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'url': s3_url,
                'file_name': file_name,
                'content_type': upload_req.content_type,
                'size': len(file_content)
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }

def get_telegram_file_url(file_id: str) -> Optional[str]:
    """Получает URL файла из Telegram API"""
    try:
        url = f'https://api.telegram.org/bot{BOT_TOKEN}/getFile'
        response = requests.post(url, json={'file_id': file_id}, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            file_path = result.get('result', {}).get('file_path')
            if file_path:
                return f'https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}'
        
        return None
    except:
        return None

def download_file(url: str) -> Optional[bytes]:
    """Скачивает файл по URL"""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.content
        return None
    except:
        return None

def get_file_extension(content_type: str) -> str:
    """Возвращает расширение файла по типу контента"""
    extensions = {
        'photo': '.jpg',
        'video': '.mp4',
        'voice': '.ogg',
        'video_note': '.mp4',
        'sticker': '.webp',
        'document': '.bin'
    }
    return extensions.get(content_type, '.bin')

def upload_to_s3(file_content: bytes, file_name: str, content_type: str) -> Optional[str]:
    """Загружает файл в S3 хранилище"""
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        s3_client = boto3.client('s3')
        
        mime_types = {
            'photo': 'image/jpeg',
            'video': 'video/mp4',
            'voice': 'audio/ogg',
            'video_note': 'video/mp4',
            'sticker': 'image/webp',
            'document': 'application/octet-stream'
        }
        
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=file_name,
            Body=file_content,
            ContentType=mime_types.get(content_type, 'application/octet-stream')
        )
        
        s3_url = f"https://{S3_BUCKET_NAME}.storage.yandexcloud.net/{file_name}"
        return s3_url
        
    except ClientError:
        return None
    except:
        return None
