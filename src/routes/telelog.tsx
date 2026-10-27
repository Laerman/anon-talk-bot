import { createFileRoute } from "@tanstack/react-router";
import Telelog from "@/pages/Telelog";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/telelog")({
  head: () => ({
    meta: pageMeta({
      title: "Telelog — Поехали!",
      description: "Telelog — проверка Telegram-пользователей и их групп.",
      image: "https://cdn.poehali.dev/projects/***/files/2e11fe0c-3828-498e-af53-ce6ed0b49d84.jpg",
      imageAlt: "Telelog — лупа над сетью чатов и групп",
    }),
  }),
  component: Telelog,
});
