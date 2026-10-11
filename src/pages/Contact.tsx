import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

const SEND_MAIL_URL = 'https://formsubmit.co/ajax/ptizaforest.89@gmail.com';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch(SEND_MAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          'Имя': name,
          'Контакт': contact || '—',
          'Сообщение': message,
          _subject: `Заявка с сайта от ${name}`,
          _template: 'table',
          _captcha: 'false',
          ...(contact.includes('@') ? { _replyto: contact } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = data.success === true || data.success === 'true';
      if (!res.ok || !ok) throw new Error(data.message || 'Не удалось отправить письмо');
      setStatus('sent');
      setName('');
      setContact('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card text-card-foreground shadow-sm p-6 sm:p-8">
        {status === 'sent' ? (
          <div className="text-center space-y-4 py-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="CheckCircle2" size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Сообщение отправлено</h1>
            <p className="text-muted-foreground">Спасибо! Мы свяжемся с вами в ближайшее время.</p>
            <Button variant="outline" onClick={() => setStatus('idle')}>
              Отправить ещё
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Напишите нам</h1>
              <p className="text-sm text-muted-foreground">Заполните форму — письмо придёт на почту.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Имя *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" required maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Почта или телефон</Label>
              <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Для ответа" maxLength={150} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Сообщение *</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ваш вопрос или заявка" required rows={5} maxLength={5000} />
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <Icon name="CircleAlert" size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={status === 'sending'}>
              {status === 'sending' ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Отправляю...
                </>
              ) : (
                <>
                  <Icon name="Send" size={16} className="mr-2" />
                  Отправить
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}