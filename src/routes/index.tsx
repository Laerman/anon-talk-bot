import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
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
