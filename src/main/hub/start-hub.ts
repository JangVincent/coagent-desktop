import { WebSocketServer, WebSocket } from "ws";
import {
  MSG,
  DEFAULT_ROOM,
  parseMentions,
  encode,
  decode,
  type ChatMsg,
  type ClientMsg,
  type Participant,
  type Role,
} from "../../shared/protocol.ts";
import type { AddressInfo } from "net";

const SEND_AND_CLOSE_TIMEOUT_MS = 500;
const SHUTDOWN_FORCE_EXIT_MS = 1000;

interface WsState {
  name: string | null;
  role: Role | null;
  room: string;
}

export interface HubHandle {
  port: number;
  close(): Promise<void>;
}

export async function startHub(opts: {
  host?: string;
  port?: number;
}): Promise<HubHandle> {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 0;

  const states = new WeakMap<WebSocket, WsState>();
  // name → ws (global, names must be unique across all rooms)
  const clients = new Map<string, WebSocket>();

  function participantRoom(ws: WebSocket): string {
    return states.get(ws)?.room ?? DEFAULT_ROOM;
  }

  function roster(): Participant[] {
    return [...clients.entries()].map(([name, ws]) => ({
      name,
      role: states.get(ws)!.role!,
      room: participantRoom(ws),
    }));
  }

  // Broadcast to all participants in `room`. Humans always receive room
  // broadcasts regardless of their own ws state.room, since the renderer
  // shows a multi-room view.
  function broadcastToRoom(room: string, obj: unknown, except?: WebSocket) {
    const payload = encode(obj);
    for (const [, ws] of clients) {
      if (ws === except) continue;
      const st = states.get(ws);
      const isHuman = st?.role === "human";
      if (!isHuman && participantRoom(ws) !== room) continue;
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  // Broadcast full roster update (all rooms) to everyone.
  function broadcastRoster() {
    const all = roster();
    const payload = encode({ type: MSG.ROSTER, participants: all });
    for (const ws of clients.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  function sendAndClose(ws: WebSocket, text: string) {
    const payload = encode({ type: MSG.SYSTEM, text });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      try { ws.close(); } catch {}
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload, () => close());
      setTimeout(close, SEND_AND_CLOSE_TIMEOUT_MS).unref();
    } else {
      close();
    }
  }

  const wss = new WebSocketServer({ port, host });

  wss.on("connection", (ws) => {
    states.set(ws, { name: null, role: null, room: DEFAULT_ROOM });

    ws.on("message", (raw) => {
      const data = states.get(ws)!;
      let msg: ClientMsg;
      try {
        msg = decode<ClientMsg>(raw.toString());
      } catch {
        return;
      }

      // ── hello ──────────────────────────────────────────────────────────
      if (!data.name) {
        if (msg.type !== MSG.HELLO || !msg.name || !msg.role) {
          sendAndClose(ws, "expected hello { name, role }");
          return;
        }
        if (clients.has(msg.name)) {
          sendAndClose(ws, `name '${msg.name}' already taken`);
          return;
        }
        const room = msg.room ?? DEFAULT_ROOM;
        data.name = msg.name;
        data.role = msg.role;
        data.room = room;
        clients.set(msg.name, ws);
        ws.send(encode({
          type: MSG.SYSTEM,
          text: `welcome ${msg.name}`,
          participants: roster(),
          room,
        }));
        broadcastToRoom(room, {
          type: MSG.SYSTEM,
          text: `${msg.name} (${msg.role}) joined`,
          room,
        }, ws);
        broadcastRoster();
        return;
      }

      const senderRoom = data.room;

      // ── chat message ───────────────────────────────────────────────────
      if (msg.type === MSG.MESSAGE && typeof msg.content === "string") {
        // Humans may address any room via msg.room; agents always use their ws state.
        const targetRoom = (data.role === "human" && msg.room) ? msg.room : senderRoom;
        const roomClients = new Set(
          [...clients.entries()]
            .filter(([, w]) => participantRoom(w) === targetRoom)
            .map(([name]) => name)
        );
        roomClients.add("all");
        const out: ChatMsg = {
          type: "message",
          from: data.name,
          content: msg.content,
          mentions: parseMentions(msg.content, roomClients),
          ts: Date.now(),
          room: targetRoom,
        };
        broadcastToRoom(targetRoom, out);
        return;
      }

      // ── control ────────────────────────────────────────────────────────
      if (msg.type === MSG.CONTROL) {
        if (data.role !== "human") {
          ws.send(encode({ type: MSG.SYSTEM, text: "control: only humans may issue control ops", room: senderRoom }));
          return;
        }
        const targetWs = clients.get(msg.target);
        const targetState = targetWs ? states.get(targetWs) : undefined;
        if (!targetWs || targetState?.role !== "agent") {
          ws.send(encode({ type: MSG.SYSTEM, text: `control: no agent named '${msg.target}'`, room: senderRoom }));
          return;
        }
        const targetRoom = targetState ? participantRoom(targetWs) : senderRoom;
        targetWs.send(encode({ ...msg, from: data.name, room: targetRoom }));
        return;
      }

      // ── control_ack ────────────────────────────────────────────────────
      if (msg.type === MSG.CONTROL_ACK) {
        broadcastToRoom(senderRoom, { ...msg, ts: Date.now(), room: senderRoom });
        return;
      }

      // ── activity ───────────────────────────────────────────────────────
      if (msg.type === MSG.ACTIVITY) {
        if (msg.name !== data.name) return;
        broadcastToRoom(senderRoom, { ...msg, ts: Date.now(), room: senderRoom }, ws);
        return;
      }
    });

    ws.on("close", () => {
      const data = states.get(ws);
      if (!data) return;
      const { name, room } = data;
      if (name && clients.get(name) === ws) {
        clients.delete(name);
        broadcastToRoom(room, { type: MSG.SYSTEM, text: `${name} left`, room });
        broadcastRoster();
      }
    });
  });

  const actualPort = await new Promise<number>((resolve, reject) => {
    wss.once("listening", () => {
      resolve((wss.address() as AddressInfo).port);
    });
    wss.once("error", reject);
  });

  return {
    port: actualPort,
    close(): Promise<void> {
      return new Promise((resolve) => {
        for (const ws of clients.values()) {
          try { ws.close(); } catch {}
        }
        wss.close(() => resolve());
        setTimeout(resolve, SHUTDOWN_FORCE_EXIT_MS).unref();
      });
    },
  };
}
