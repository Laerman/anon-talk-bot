import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Icon from '@/components/ui/icon';

export interface GroupRow {
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

interface Props {
  rows: GroupRow[];
  userLabels: { id: number; label: string }[];
}

type View = 'users' | 'groups';

const shortDate = (v?: string) => (v ? String(v).slice(0, 10) : '—');

export default function ResultsView({ rows, userLabels }: Props) {
  const [view, setView] = useState<View>('users');
  const [q, setQ] = useState('');
  const [onlyCommon, setOnlyCommon] = useState(false);

  const query = q.trim().toLowerCase();

  const byUser = useMemo(() => {
    const map = new Map<number, { label: string; id: number; groups: GroupRow[] }>();
    userLabels.forEach((u) => map.set(u.id, { label: u.label, id: u.id, groups: [] }));
    rows.forEach((r) => {
      if (!map.has(r.userId)) map.set(r.userId, { label: r.userLabel, id: r.userId, groups: [] });
      map.get(r.userId)!.groups.push(r);
    });
    return Array.from(map.values()).map((u) => ({
      ...u,
      groups: u.groups.sort((a, b) => (b.messagesCount || 0) - (a.messagesCount || 0)),
    }));
  }, [rows, userLabels]);

  const byGroup = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        title: string;
        username?: string;
        isPrivate?: boolean;
        users: { label: string; messagesCount?: number; lastMessage?: string }[];
      }
    >();
    rows.forEach((r) => {
      const key = String(r.groupId ?? r.title ?? 'unknown');
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: r.title || 'Без названия',
          username: r.username,
          isPrivate: r.isPrivate,
          users: [],
        });
      }
      map.get(key)!.users.push({
        label: r.userLabel,
        messagesCount: r.messagesCount,
        lastMessage: r.lastMessage,
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => b.users.length - a.users.length || a.title.localeCompare(b.title),
    );
  }, [rows]);

  const filteredUsers = useMemo(() => {
    if (!query) return byUser;
    return byUser
      .map((u) => ({
        ...u,
        groups: u.label.toLowerCase().includes(query)
          ? u.groups
          : u.groups.filter(
              (g) =>
                (g.title || '').toLowerCase().includes(query) ||
                (g.username || '').toLowerCase().includes(query),
            ),
      }))
      .filter((u) => u.groups.length > 0 || u.label.toLowerCase().includes(query));
  }, [byUser, query]);

  const filteredGroups = useMemo(() => {
    let list = byGroup;
    if (onlyCommon) list = list.filter((g) => g.users.length > 1);
    if (!query) return list;
    return list.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        (g.username || '').toLowerCase().includes(query) ||
        g.users.some((u) => u.label.toLowerCase().includes(query)),
    );
  }, [byGroup, query, onlyCommon]);

  const commonCount = byGroup.filter((g) => g.users.length > 1).length;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">
            {byUser.length} юзеров · {byGroup.length} уникальных групп
            {commonCount > 0 && ` · ${commonCount} пересечений`}
          </CardTitle>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <Button
              size="sm"
              variant={view === 'users' ? 'default' : 'ghost'}
              onClick={() => setView('users')}
              className="h-7"
            >
              <Icon name="User" size={14} className="mr-1.5" />
              По юзерам
            </Button>
            <Button
              size="sm"
              variant={view === 'groups' ? 'default' : 'ghost'}
              onClick={() => setView('groups')}
              className="h-7"
            >
              <Icon name="Users" size={14} className="mr-1.5" />
              По группам
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon
              name="Search"
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по группе или юзеру"
              className="pl-8 h-9"
            />
          </div>
          {view === 'groups' && (
            <Button
              size="sm"
              variant={onlyCommon ? 'default' : 'outline'}
              onClick={() => setOnlyCommon(!onlyCommon)}
              className="h-9"
            >
              <Icon name="GitMerge" size={14} className="mr-1.5" />
              Только общие
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {view === 'users' ? (
          <Accordion type="multiple" className="w-full">
            {filteredUsers.map((u) => (
              <AccordionItem key={u.id} value={String(u.id)}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">{u.label}</span>
                    <span className="text-xs text-muted-foreground">id {u.id}</span>
                    <Badge variant="secondary">{u.groups.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {u.groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1">Групп не найдено</p>
                  ) : (
                    <div className="divide-y border rounded-lg overflow-hidden">
                      {u.groups.map((g, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate font-medium">
                                {g.title || 'Без названия'}
                              </span>
                              {g.username && (
                                <a
                                  href={`https://t.me/${g.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Открыть t.me/${g.username}`}
                                  className="shrink-0 text-primary hover:opacity-70"
                                >
                                  <Icon name="ExternalLink" size={14} />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {g.username ? '@' + g.username : g.isPrivate ? 'приватная' : '—'}
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div>{g.messagesCount ?? '—'} сообщ.</div>
                            <div className="text-xs text-muted-foreground">
                              {shortDate(g.lastMessage)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filteredGroups.map((g) => (
              <AccordionItem key={g.key} value={g.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left min-w-0">
                    <span className="font-medium truncate">{g.title}</span>
                    {g.username && (
                      <span
                        role="link"
                        tabIndex={0}
                        title={`Открыть t.me/${g.username}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://t.me/${g.username}`, '_blank', 'noopener');
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="shrink-0 text-primary hover:opacity-70"
                      >
                        <Icon name="ExternalLink" size={14} />
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {g.username ? '@' + g.username : g.isPrivate ? 'приватная' : ''}
                    </span>
                    <Badge variant={g.users.length > 1 ? 'default' : 'secondary'}>
                      {g.users.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="divide-y border rounded-lg overflow-hidden">
                    {g.users.map((u, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 text-sm">
                        <span className="flex-1 truncate">{u.label}</span>
                        <span className="whitespace-nowrap">{u.messagesCount ?? '—'} сообщ.</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {shortDate(u.lastMessage)}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {(view === 'users' ? filteredUsers : filteredGroups).length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Ничего не найдено</p>
        )}
      </CardContent>
    </Card>
  );
}