import { createFileRoute } from "@tanstack/react-router";
import AdminLogin from "@/pages/AdminLogin";

export const Route = createFileRoute("/trtq")({
  head: () => ({
    meta: [{ title: "Вход для администратора" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <>
      <h1 className="sr-only">Панель администратора — вход для администраторов сервиса анонимного чата</h1>
      <AdminLogin />
    </>
  );
}