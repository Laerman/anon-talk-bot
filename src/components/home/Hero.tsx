import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <Icon name="Sparkles" size={14} className="text-primary" />
          Боты, платежи и рассылки в одном месте
        </div>

        <h1 className="text-4xl font-bold leading-tight md:text-6xl">
          СвойКит — платформа для{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            автоматизации бизнеса
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Подключайте Telegram и VK, принимайте оплату, запускайте рассылки и
          управляйте всем из одной админ-панели.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto">
            <Icon name="Rocket" size={18} className="mr-2" />
            Начать бесплатно
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            <Icon name="Play" size={18} className="mr-2" />
            Смотреть демо
          </Button>
        </div>
      </div>
    </section>
  );
}
