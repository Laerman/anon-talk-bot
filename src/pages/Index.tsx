import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const SEND_MAIL_URL = 'https://functions.poehali.dev/f71776d7-d994-4934-8f67-9644c098be68';

export default function Index() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(SEND_MAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, message }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({ ok: true, text: 'Письмо отправлено! Проверь почту 123@svoikit.online' });
        setName('');
        setContact('');
        setMessage('');
      } else {
        setStatus({ ok: false, text: data.error || 'Не удалось отправить письмо' });
      }
    } catch {
      setStatus({ ok: false, text: 'Ошибка соединения. Попробуй ещё раз' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Mail" size={22} />
            Проверка почты
          </CardTitle>
          <CardDescription>
            Отправь тестовое сообщение — оно придёт на 123@svoikit.online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как тебя зовут"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Контакт</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Телефон или email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Текст письма"
                rows={4}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                  Отправляем...
                </>
              ) : (
                <>
                  <Icon name="Send" size={18} className="mr-2" />
                  Отправить
                </>
              )}
            </Button>

            {status && (
              <div
                className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                  status.ok
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <Icon name={status.ok ? 'CircleCheck' : 'CircleAlert'} size={18} />
                <span>{status.text}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
