import { MSG, DEFAULT_ROOM, encode, decode, type ServerMsg } from "@shared/protocol.ts";
import { roster } from "./stores/roster.ts";
import { dispatchServerMsg } from "./stores/messages.ts";
import { setActivity } from "./stores/activities.ts";

let ws: WebSocket | null = null;
let port = 0;
let myName = "";
let myRoom = DEFAULT_ROOM;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let manualClose = false; // true while intentionally disconnecting for rename
const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];

export function initWsClient(hubPort: number, name: string, room = DEFAULT_ROOM) {
  port = hubPort;
  myName = name;
  myRoom = room;
  connect();
}

// The human always joins the DEFAULT_ROOM — they switch "view" by selecting
// a room in the UI, but the WS connection itself remains on the default room
// since we need to see roster updates across all rooms. The hub broadcasts
// the full roster (all rooms) to everyone, so one connection suffices.
function connect() {
  ws = new WebSocket(`ws://127.0.0.1:${port}`);

  ws.onopen = () => {
    reconnectAttempt = 0;
    ws!.send(encode({ type: MSG.HELLO, name: myName, role: "human", room: myRoom }));
  };

  ws.onmessage = (ev) => {
    let msg: ServerMsg;
    try {
      msg = decode<ServerMsg>(ev.data as string);
    } catch {
      return;
    }

    if (msg.type === MSG.ROSTER) {
      roster.set(msg.participants);
    } else if (msg.type === MSG.SYSTEM) {
      if (Array.isArray(msg.participants)) roster.set(msg.participants);
      dispatchServerMsg(msg, myName);
    } else if (msg.type === MSG.MESSAGE) {
      dispatchServerMsg(msg, myName);
    } else if (msg.type === MSG.CONTROL_ACK) {
      dispatchServerMsg(msg, myName);
    } else if (msg.type === MSG.ACTIVITY) {
      setActivity(msg);
    }
  };

  ws.onclose = () => {
    if (manualClose) return; // reconnectWithName() handles reconnect
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, delay);
  };

  ws.onerror = () => {
    // always followed by close
  };
}

export function sendChat(content: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(encode({ type: MSG.MESSAGE, content }));
  }
}

export function sendControl(target: string, op: string, arg?: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(encode({ type: MSG.CONTROL, target, op, arg } as any));
  }
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}

// Disconnect with the old name and reconnect with the new one.
// The hub releases the old name on close, so the new name can register cleanly.
export function reconnectWithName(newName: string) {
  myName = newName;
  manualClose = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  try { ws?.close(); } catch {}
  // Small delay so the hub processes the disconnect before the new hello
  setTimeout(() => {
    manualClose = false;
    reconnectAttempt = 0;
    connect();
  }, 300);
}
