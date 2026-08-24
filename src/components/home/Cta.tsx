import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function Cta() {
  return (
    <section className="px-4 pb-24">
      <div className="gradient-border mx-auto max-w-4xl p-10 text-center md:p-14">
        <h2 className="text-3xl font-bold md:text-4xl">
          Готовы запустить автоматизацию?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Подключим бота, оплату и рассылки под ваш бизнес. Первая настройка —
          бесплатно.
        </p>
        <Button size="lg" className="mt-8">
          <Icon name="MessageCircle" size={18} className="mr-2" />
          Оставить заявку
        </Button>
      </div>
    </section>
  );
}
