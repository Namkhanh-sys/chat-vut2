import { createFileRoute } from "@tanstack/react-router";
import { DMChat } from "@/components/dm/DMChat";

export const Route = createFileRoute("/app/dm/$userId")({
  component: DMRoute,
});

function DMRoute() {
  return <DMChat />;
}
