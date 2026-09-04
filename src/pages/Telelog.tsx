import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import ResultsView, { GroupRow } from '@/components/telelog/ResultsView';
import { exportExcel } from '@/components/telelog/exportExcel';
import { createRateLimiter, runPool, sleep } from '@/components/telelog/rateLimit';
import LogPanels, { LogLine } from '@/components/telelog/LogPanels';

const API_URL = 'https://functions.poehali.dev/696c8844-0e83-447d-87b4-7323c0136e7a';
const RPS = 15;
const CONCURRENCY = 6;
const RESOLVE_CHUNK = 25;
const MAX_RETRIES = 5;

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
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [checkedUsers, setCheckedUsers] = useState<{ id: number; label: string }[]>([]);
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

  const callLimited = async (
    payload: Record<string, unknown>,
    take: () => Promise<void>,
    attempt = 0,
  ): Promise<any> => {
    await take();
    let r: any;
    try {
      r = await call(payload);
    } catch (e) {
      r = { success: false, status: 0, data: { error: String(e) } };
    }
    const retriable = [0, 429, 502, 503, 504].includes(r?.status);
    if (retriable && attempt < MAX_RETRIES) {
      await sleep(700 * Math.pow(2, attempt) + Math.random() * 300);
      return callLimited(payload, take, attempt + 1);
    }
    return r;
  };

  const run = async () => {
    const tokens = parseTokens(users);
    if (!token.trim()) return addLog('Введите токен', 'error');
    if (!tokens.length) return addLog('Список пуст', 'error');

    setLoading(true);
    setRows([]);
    setCheckedUsers([]);
    setLog([]);
    setBalance(null);

    const targets: { id: number; label: string }[] = [];
    const names = tokens.filter((t) => !/^\d+$/.test(t.replace(/^@/, '')));

    const resolved: Record<string, { id: number; username: string }> = {};
    if (names.length) {
      const takeResolve = createRateLimiter(RPS);
      const chunks: string[][] = [];
      for (let i = 0; i < names.length; i += RESOLVE_CHUNK)
        chunks.push(names.slice(i, i + RESOLVE_CHUNK));

      addLog(`Определяю ID для ${names.length} username (${chunks.length} пачек)...`);

      await runPool(chunks, CONCURRENCY, async (chunk) => {
        const r = await callLimited({ action: 'resolve', names: chunk }, takeResolve);
        if (!r.success) {
          addLog(`Ошибка резолва (HTTP ${r.status}): ${JSON.stringify(r.data)}`, 'error');
        } else {
          (r.data?.data || []).forEach((u: { id: number; username: string }) => {
            if (u.username) resolved[u.username.toLowerCase()] = u;
          });
        }
      });
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
    const take = createRateLimiter(RPS);
    let done = 0;

    addLog(`Проверяю ${targets.length} юзеров — до ${RPS} запросов в секунду`);

    await runPool(targets, CONCURRENCY, async (tgt) => {
      const r = await callLimited({ action: 'groups', userId: String(tgt.id) }, take);

      if (!r.success) {
        const msg =
          r.status === 401
            ? 'неверный или истёкший токен'
            : r.status === 402
              ? 'недостаточно баланса'
              : r.status === 504
                ? 'сервис не ответил вовремя'
                : JSON.stringify(r.data).slice(0, 200);
        addLog(`${tgt.label}: ошибка (HTTP ${r.status}) — ${msg}`, 'error');
      } else {
        const body = r.data || {};
        const groups = body.data || [];
        const bal = body.tech?.current_ballance;
        if (bal !== undefined && bal !== null) setBalance(bal);
        addLog(`${tgt.label} (id=${tgt.id}) — групп: ${groups.length}`, 'ok');
        setCheckedUsers((prev) => [...prev, { id: tgt.id, label: tgt.label }]);
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
      done++;
      setProgress({ done, total: targets.length });
    });

    addLog(`Готово: ${collected.length} строк`, 'ok');
    setLoading(false);
  };

  const downloadExcel = async () => {
    setExporting(true);
    await exportExcel(rows, checkedUsers);
    setExporting(false);
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
              <Button
                variant="outline"
                onClick={downloadExcel}
                disabled={!rows.length || exporting}
              >
                <Icon
                  name={exporting ? 'Loader2' : 'FileSpreadsheet'}
                  size={16}
                  className={exporting ? 'mr-2 animate-spin' : 'mr-2'}
                />
                Скачать Excel
              </Button>
              {balance !== null && (
                <span className="text-sm text-muted-foreground">Баланс: {balance}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {log.length > 0 && <LogPanels log={log} />}

        {checkedUsers.length > 0 && <ResultsView rows={rows} userLabels={checkedUsers} />}
      </div>
    </div>
  );
}