import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const items = [
  {
    icon: 'Send',
    title: 'Telegram и VK боты',
    text: 'Приём заявок, автоответы и меню без единой строчки кода.',
  },
  {
    icon: 'CreditCard',
    title: 'Приём платежей',
    text: 'Оплата картой через ЮKassa прямо в чате или на сайте.',
  },
  {
    icon: 'Mail',
    title: 'Рассылки',
    text: 'Письма клиентам по базе с отслеживанием доставки.',
  },
  {
    icon: 'LayoutDashboard',
    title: 'Админ-панель',
    text: 'Заявки, клиенты и статистика в одном окне.',
  },
  {
    icon: 'FolderUp',
    title: 'Файлы и документы',
    text: 'Загрузка и хранение файлов с быстрой отдачей.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Безопасность',
    text: 'Данные хранятся на защищённых серверах в России.',
  },
];

export default function Features() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold md:text-4xl">
          Всё, что нужно бизнесу
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
          Собрали инструменты, за которые обычно платят пяти разным сервисам.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.title}
              className="border-border transition-colors hover:border-primary/50"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15">
                  <Icon name={item.icon} size={22} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
