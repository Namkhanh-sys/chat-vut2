import { Download, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportGroupMessages } from "@/lib/chat-export";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportChatButtonProps {
  groupId: string;
  groupName: string;
}

export function ExportChatButton({ groupId, groupName }: ExportChatButtonProps) {
  const handleExport = async (format: "json" | "csv" | "txt") => {
    try {
      await exportGroupMessages(groupId, groupName, format, supabase);
      toast.success(`Chat exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export chat");
      console.error(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="mr-2 h-4 w-4" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("txt")}>
          <FileText className="mr-2 h-4 w-4" />
          Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
