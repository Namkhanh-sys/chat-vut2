import { useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EmojiPickerProps {
  onEmojiClick: (emoji: string) => void;
  theme?: "light" | "dark";
}

export function EmojiPickerComponent({ onEmojiClick, theme = "light" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiClick(emojiData.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80 p-0">
        <div className="emoji-picker-container">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={theme as Theme}
            autoFocusSearch
            height={400}
            width="100%"
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
