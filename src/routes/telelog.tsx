import { createFileRoute } from "@tanstack/react-router";
import Telelog from "@/pages/Telelog";

export const Route = createFileRoute("/telelog")({
  component: Telelog,
});
