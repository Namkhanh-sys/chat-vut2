import { createFileRoute } from "@tanstack/react-router";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const Route = createFileRoute("/app/$groupId")({
  component: GroupRoute,
});

function GroupRoute() {
  const { groupId } = Route.useParams();
  return <ChatRoom groupId={groupId} />;
}
