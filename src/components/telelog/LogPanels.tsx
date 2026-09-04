import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export interface LogLine {
  text: string;
  type: 'info' | 'error' | 'ok';
}

interface Props {
  log: LogLine[];
}

const copy = (lines: LogLine[]) => navigator.clipboard.writeText(lines.map((l) => l.text).join('\n'));

export default function LogPanels({ log }: Props) {
  const errors = log.filter((l) => l.type === 'error');
  const process = log.filter((l) => l.type !== 'error');

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="Activity" size={16} className="text-slate-500" />
            Процесс
            <Badge variant="secondary">{process.length}</Badge>
          </CardTitle>
          {process.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => copy(process)}>
              <Icon name="Copy" size={14} />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto space-y-1 font-mono text-xs">
            {process.length === 0 ? (
              <p className="text-muted-foreground">Пока пусто</p>
            ) : (
              process.map((l, i) => (
                <div key={i} className={l.type === 'ok' ? 'text-green-700' : 'text-slate-600'}>
                  {l.text}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={errors.length ? 'border-red-300' : undefined}>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon
              name={errors.length ? 'TriangleAlert' : 'CircleCheck'}
              size={16}
              className={errors.length ? 'text-red-500' : 'text-green-600'}
            />
            Ошибки
            {errors.length > 0 && <Badge variant="destructive">{errors.length}</Badge>}
          </CardTitle>
          {errors.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => copy(errors)}>
              <Icon name="Copy" size={14} />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto space-y-1 font-mono text-xs">
            {errors.length === 0 ? (
              <p className="text-muted-foreground">Ошибок нет</p>
            ) : (
              errors.map((l, i) => (
                <div key={i} className="text-red-600">
                  {l.text}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
