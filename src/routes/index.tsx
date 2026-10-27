import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: "Поехали!",
      description: "Poehali.dev — запусти свой сайт за минуту!",
      image: "https://cdn.poehali.dev/projects/7e0de1b9-4cfa-4b7c-808d-bcd017271665/files/4be3bc3e-43bc-45d5-b680-e831e245f065.jpg",
      imageAlt: "Поехали! — ракета взлетает с экрана ноутбука",
    }),
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <h1 className="sr-only">Поехали! — Poehali.dev — запусти свой сайт за минуту!</h1>
      <Index />
    </>
  );
}