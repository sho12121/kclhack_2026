import "server-only";
import { maskNgWords } from "./ng-word-filter";
import { parseMessageSnapshot } from "./board-messages";

export function filteredSnapshot(value: unknown) {
  const snapshot = parseMessageSnapshot(value);
  return {...snapshot,messages:snapshot.messages.map(message=>({...message,
    content:snapshot.filterEnabled ? maskNgWords(message.content) : message.content,
    replyToContent:message.replyToContent == null ? message.replyToContent : (snapshot.filterEnabled ? maskNgWords(message.replyToContent) : message.replyToContent).slice(0,240),
  }))};
}
