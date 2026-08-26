import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const CLEANUP_API_URL = 'https://functions.poehali.dev/44deba1f-2392-4866-9015-8df267216a6c';

interface Attachment {
  id: number;
  chat_id: number;
  photo_url: string;
  content_type: string;
  sent_at: string;
  sender_gender: string;
}

interface AttachmentsListProps {
  attachments: Attachment[];
  onCleanupComplete: () => void;
}

export default function AttachmentsList({ attachments, onCleanupComplete }: AttachmentsListProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const response = await fetch(CLEANUP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Очистка завершена',
          description: `Удалено вложений: ${data.deleted_count}`,
        });
        onCleanupComplete();
      } else {
        throw new Error(data.error || 'Ошибка очистки');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить очистку',
        variant: 'destructive',
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Вы уверены? Будет удалено ${attachments.length} вложений.`)) {
      return;
    }
    
    setIsDeletingAll(true);
    try {
      const response = await fetch(CLEANUP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_all: true })
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Все вложения удалены',
          description: `Удалено: ${data.deleted_count}`,
        });
        onCleanupComplete();
      } else {
        throw new Error(data.error || 'Ошибка удаления');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить вложения',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const getTimeUntilDeletion = (dateStr: string) => {
    const date = new Date(dateStr);
    const deletionTime = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deletionTime.getTime() - now.getTime();
    const hoursLeft = Math.floor(diffMs / (60 * 60 * 1000));
    const minsLeft = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (hoursLeft > 0) return `${hoursLeft}ч`;
    if (minsLeft > 0) return `${minsLeft}м`;
    return 'скоро';
  };

  const getGenderIcon = (gender: string) => {
    if (gender === 'male') return { icon: 'User', color: 'text-blue-500' };
    if (gender === 'female') return { icon: 'User', color: 'text-pink-500' };
    return { icon: 'User', color: 'text-gray-500' };
  };

  const getMediaIcon = (type: string) => {
    if (type === 'voice') return { icon: 'Mic', label: 'Голосовое' };
    if (type === 'video_note') return { icon: 'VideoIcon', label: 'Кружок' };
    if (type === 'video') return { icon: 'Video', label: 'Видео' };
    return { icon: 'Image', label: 'Фото' };
  };

  const handleMediaClick = (attachment: Attachment) => {
    if (attachment.content_type === 'photo') {
      setSelectedImage(attachment.photo_url);
    } else {
      setSelectedMedia({ url: attachment.photo_url, type: attachment.content_type });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Image" size={24} />
              Вложения ({attachments.length})
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                <Icon name="Clock" size={16} />
                Автоудаление 24ч
              </div>
              <Button 
                onClick={handleCleanup} 
                disabled={isCleaningUp || isDeletingAll || attachments.length === 0}
                variant="outline"
                size="sm"
              >
                {isCleaningUp ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Очистка...
                  </>
                ) : (
                  <>
                    <Icon name="Trash2" size={16} className="mr-2" />
                    Очистить старые
                  </>
                )}
              </Button>
              <Button 
                onClick={handleDeleteAll} 
                disabled={isCleaningUp || isDeletingAll || attachments.length === 0}
                variant="destructive"
                size="sm"
              >
                {isDeletingAll ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <Icon name="Trash" size={16} className="mr-2" />
                    Удалить всё
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Image" size={48} className="mx-auto mb-4 opacity-20" />
              <p>Пока нет фото в чатах</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {attachments.map((attachment) => {
                const genderInfo = getGenderIcon(attachment.sender_gender);
                const mediaInfo = getMediaIcon(attachment.content_type);
                const isPhoto = attachment.content_type === 'photo';
                
                return (
                  <div
                    key={attachment.id}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer transition-transform hover:scale-105"
                    onClick={() => handleMediaClick(attachment)}
                  >
                    {isPhoto ? (
                      <img
                        src={attachment.photo_url}
                        alt={`Фото из чата ${attachment.chat_id}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Icon name={mediaInfo.icon as any} size={48} className="text-primary mb-2" />
                        <span className="text-sm font-medium text-primary">{mediaInfo.label}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Icon name="Clock" size={12} />
                      {getTimeUntilDeletion(attachment.sent_at)}
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-between items-start">
                        <span className={`text-xs ${genderInfo.color}`}>
                          <Icon name={genderInfo.icon as any} size={16} />
                        </span>
                        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                          CH-{attachment.chat_id}
                        </span>
                      </div>
                      <span className="text-xs text-white">
                        {formatDate(attachment.sent_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <Icon name="X" size={32} />
          </button>
          <img
            src={selectedImage}
            alt="Просмотр фото"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedMedia(null)}
          >
            <Icon name="X" size={32} />
          </button>
          <div className="bg-card p-6 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.type === 'voice' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon name="Mic" size={24} className="text-primary" />
                  <h3 className="text-lg font-semibold">Голосовое сообщение</h3>
                </div>
                <audio controls className="w-full">
                  <source src={selectedMedia.url} type="audio/ogg" />
                  Ваш браузер не поддерживает аудио.
                </audio>
              </div>
            )}
            {selectedMedia.type === 'video_note' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon name="VideoIcon" size={24} className="text-primary" />
                  <h3 className="text-lg font-semibold">Видео-кружок</h3>
                </div>
                <video controls className="w-full rounded-lg">
                  <source src={selectedMedia.url} type="video/mp4" />
                  Ваш браузер не поддерживает видео.
                </video>
              </div>
            )}
            {selectedMedia.type === 'video' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon name="Video" size={24} className="text-primary" />
                  <h3 className="text-lg font-semibold">Видео</h3>
                </div>
                <video controls className="w-full rounded-lg">
                  <source src={selectedMedia.url} type="video/mp4" />
                  Ваш браузер не поддерживает видео.
                </video>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}