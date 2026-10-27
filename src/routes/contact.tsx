import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: pageMeta({
      title: "Напишите нам — Поехали!",
      description: "Оставьте сообщение через форму — ответ придёт на вашу почту.",
      image: "https://cdn.poehali.dev/projects/***/files/bc05b7fb-7f6b-415d-a60b-0e9da1bcc555.jpg",
      imageAlt: "Напишите нам — бумажный самолётик вылетает из конверта",
    }),
  }),
  component: Contact,
});
