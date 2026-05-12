export type ExportFormat = "json" | "csv" | "txt";

export interface ChatExport {
  groupName: string;
  groupId: string;
  exportedAt: string;
  messageCount: number;
  messages: Array<{
    id: string;
    sender: string;
    senderId: string;
    content: string;
    timestamp: string;
    attachments?: Array<{ name: string; url: string }>;
    replyTo?: string;
  }>;
}

export function generateJSON(chatExport: ChatExport): string {
  return JSON.stringify(chatExport, null, 2);
}

export function generateCSV(chatExport: ChatExport): string {
  const headers = ["Timestamp", "Sender", "Content", "Attachments"];
  const rows = chatExport.messages.map((msg) => [
    msg.timestamp,
    msg.sender,
    `"${msg.content?.replace(/"/g, '""') || ""}"`,
    msg.attachments?.map((a) => a.name).join(";") || "",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

export function generateTXT(chatExport: ChatExport): string {
  let txt = `=== Chat Export: ${chatExport.groupName} ===\n`;
  txt += `Exported: ${chatExport.exportedAt}\n`;
  txt += `Total Messages: ${chatExport.messageCount}\n\n`;
  txt += "=".repeat(80) + "\n\n";

  for (const msg of chatExport.messages) {
    txt += `[${msg.timestamp}] ${msg.sender}:\n`;
    txt += `${msg.content || ""}\n`;
    if (msg.attachments?.length) {
      txt += `Attachments: ${msg.attachments.map((a) => a.name).join(", ")}\n`;
    }
    if (msg.replyTo) {
      txt += `Reply to: ${msg.replyTo}\n`;
    }
    txt += "\n";
  }

  return txt;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportGroupMessages(
  groupId: string,
  groupName: string,
  format: ExportFormat,
  supabase: any
): Promise<void> {
  try {
    // Fetch all messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(display_name)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch attachments
    const { data: attachments } = await supabase
      .from("attachments")
      .select("message_id, file_name, url")
      .in(
        "message_id",
        messages.map((m: any) => m.id)
      );

    const attachmentMap = new Map();
    (attachments || []).forEach((att: any) => {
      if (!attachmentMap.has(att.message_id)) {
        attachmentMap.set(att.message_id, []);
      }
      attachmentMap.get(att.message_id).push({
        name: att.file_name,
        url: att.url,
      });
    });

    // Build export object
    const chatExport: ChatExport = {
      groupName,
      groupId,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender?.display_name || "Unknown",
        senderId: msg.sender_id,
        content: msg.content || "",
        timestamp: new Date(msg.created_at).toLocaleString(),
        attachments: attachmentMap.get(msg.id),
        replyTo: msg.reply_to,
      })),
    };

    // Generate content based on format
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "json":
        content = generateJSON(chatExport);
        mimeType = "application/json";
        extension = "json";
        break;
      case "csv":
        content = generateCSV(chatExport);
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "txt":
        content = generateTXT(chatExport);
        mimeType = "text/plain";
        extension = "txt";
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Download file
    const filename = `${groupName.replace(/\s+/g, "_")}_${Date.now()}.${extension}`;
    downloadFile(content, filename, mimeType);
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}
