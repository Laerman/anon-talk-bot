import { createFileRoute } from "@tanstack/react-router";
import AdminLogin from "@/pages/AdminLogin";

export const Route = createFileRoute("/trtq")({
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
