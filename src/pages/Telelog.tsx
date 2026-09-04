import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

const API_URL = 'https://functions.poehali.dev/696c8844-0e83-447d-87b4-7323c0136e7a';

interface GroupRow {
  userLabel: string;
  userId: number;
  groupId?: number;
  title?: string;
  username?: string;
  isPrivate?: boolean;
  messagesCount?: number;
  firstMessage?: string;
  lastMessage?: string;
}

interface LogLine {
  text: string;
  type: 'info' | 'error' | 'ok';
}

const parseTokens = (text: string) => {
  const out: string[] = [];
  const seen = new Set<string>();
  text
    .split('\n')
    .map((l) => l.split('#')[0])
    .join(' ')
    .split(/[\s,;]+/)
    .forEach((t) => {
      const v = t.trim();
      if (!v) return;
      const key = v.replace(/^@/, '').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(v);
    });
  return out;
};

export default function Telelog() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [users, setUsers] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [balance, setBalance] = useState<number | null>(null);

  const addLog = (text: string, type: LogLine['type'] = 'info') =>
    setLog((prev) => [...prev, { text, type }]);

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload }),
    });
    return res.json();
  };

  const run = async () => {
    const tokens = parseTokens(users);
    if (!token.trim()) return addLog('Введите токен', 'error');
    if (!tokens.length) return addLog('Список пуст', 'error');

    setLoading(true);
    setRows([]);
    setLog([]);
    setBalance(null);

    const targets: { id: number; label: string }[] = [];
    const names = tokens.filter((t) => !/^\d+$/.test(t.replace(/^@/, '')));

    const resolved: Record<string, { id: number; username: string }> = {};
    if (names.length) {
      addLog(`Определяю ID для ${names.length} username...`);
      const r = await call({ action: 'resolve', names });
      if (!r.success) {
        addLog(`Ошибка резолва (HTTP ${r.status}): ${JSON.stringify(r.data)}`, 'error');
      } else {
        (r.data?.data || []).forEach((u: { id: number; username: string }) => {
          if (u.username) resolved[u.username.toLowerCase()] = u;
        });
      }
    }

    tokens.forEach((t) => {
      const bare = t.replace(/^@/, '');
      if (/^\d+$/.test(bare)) {
        targets.push({ id: Number(bare), label: bare });
      } else {
        const info = resolved[bare.toLowerCase()];
        if (info?.id) targets.push({ id: info.id, label: '@' + info.username });
        else addLog(`Не найден username: ${t}`, 'error');
      }
    });

    if (!targets.length) {
      addLog('Нет валидных пользователей', 'error');
      setLoading(false);
      return;
    }

    setProgress({ done: 0, total: targets.length });
    const collected: GroupRow[] = [];

    for (let i = 0; i < targets.length; i++) {
      const tgt = targets[i];
      const r = await call({ action: 'groups', userId: String(tgt.id) });

      if (!r.success) {
        const msg =
          r.status === 401
            ? 'неверный или истёкший токен'
            : r.status === 402
              ? 'недостаточно баланса'
              : JSON.stringify(r.data).slice(0, 200);
        addLog(`${tgt.label}: ошибка (HTTP ${r.status}) — ${msg}`, 'error');
      } else {
        const body = r.data || {};
        const groups = body.data || [];
        const bal = body.tech?.current_ballance;
        if (bal !== undefined && bal !== null) setBalance(bal);
        addLog(`${tgt.label} (id=${tgt.id}) — групп: ${groups.length}`, 'ok');
        groups.forEach((g: Record<string, any>) => {
          const chat = g.chat || {};
          collected.push({
            userLabel: tgt.label,
            userId: tgt.id,
            groupId: chat.id,
            title: chat.title,
            username: chat.username,
            isPrivate: chat.isPrivate,
            messagesCount: g.messagesCount,
            firstMessage: g.firstMessage,
            lastMessage: g.lastMessage,
          });
        });
        setRows([...collected]);
      }
      setProgress({ done: i + 1, total: targets.length });
    }

    addLog(`Готово: ${collected.length} строк`, 'ok');
    setLoading(false);
  };

  const downloadCsv = () => {
    const head = [
      'user_id',
      'user_label',
      'group_id',
      'title',
      'username',
      'is_private',
      'messages_count',
      'first_message',
      'last_message',
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      head.join(','),
      ...rows.map((r) =>
        [
          r.userId,
          r.userLabel,
          r.groupId,
          r.title,
          r.username,
          r.isPrivate,
          r.messagesCount,
          r.firstMessage,
          r.lastMessage,
        ]
          .map(esc)
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'groups.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Проверка групп пользователей</h1>
          <p className="text-sm text-muted-foreground">
            Данные из telelog.info по списку ID или @username
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Параметры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Токен (Bearer JWT)</Label>
              <div className="flex gap-2">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  autoComplete="off"
                />
                <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                  <Icon name={showToken ? 'EyeOff' : 'Eye'} size={16} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Пользователи</Label>
              <Textarea
                rows={6}
                value={users}
                onChange={(e) => setUsers(e.target.value)}
                placeholder={'123456789\n@durov\n987654321'}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={run} disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    {progress.done}/{progress.total}
                  </>
                ) : (
                  <>
                    <Icon name="Play" size={16} className="mr-2" />
                    Проверить
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={downloadCsv} disabled={!rows.length}>
                <Icon name="Download" size={16} className="mr-2" />
                Скачать CSV
              </Button>
              {balance !== null && (
                <span className="text-sm text-muted-foreground">Баланс: {balance}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {log.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Лог</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-56 overflow-auto space-y-1 font-mono text-xs">
                {log.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.type === 'error'
                        ? 'text-red-600'
                        : l.type === 'ok'
                          ? 'text-green-700'
                          : 'text-slate-600'
                    }
                  >
                    {l.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Результат — {rows.length} строк</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2 font-medium">Юзер</th>
                      <th className="p-2 font-medium">Группа</th>
                      <th className="p-2 font-medium">@</th>
                      <th className="p-2 font-medium">Сообщений</th>
                      <th className="p-2 font-medium">Последнее</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 whitespace-nowrap">{r.userLabel}</td>
                        <td className="p-2">{r.title}</td>
                        <td className="p-2 text-muted-foreground">
                          {r.username ? '@' + r.username : r.isPrivate ? 'приватная' : '—'}
                        </td>
                        <td className="p-2">{r.messagesCount ?? '—'}</td>
                        <td className="p-2 text-muted-foreground whitespace-nowrap">
                          {r.lastMessage ? String(r.lastMessage).slice(0, 10) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
