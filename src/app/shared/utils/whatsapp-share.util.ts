const WHATSAPP_SHARE_URL = 'https://wa.me/';

/** Click-to-chat URL — WhatsApp opens with `text` pre-filled and the user picks the chat. */
export function whatsappShareUrl(text: string): string {
  return `${WHATSAPP_SHARE_URL}?text=${encodeURIComponent(text)}`;
}

/** A WhatsApp tab opened up-front for a message that is still being built. */
export interface PendingWhatsappShare {
  send(text: string): void;
  cancel(): void;
}

/**
 * Opens the share tab synchronously — call it inside the click handler, so
 * popup blockers allow it — and fills it in once the (async) message is ready.
 * Falls back to a fresh tab if the reserved one was blocked or closed.
 */
export function reserveWhatsappShare(): PendingWhatsappShare {
  const win = window.open('', '_blank');
  if (win) win.opener = null;
  return {
    send(text: string): void {
      const url = whatsappShareUrl(text);
      if (win && !win.closed) {
        win.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    cancel(): void {
      win?.close();
    },
  };
}
