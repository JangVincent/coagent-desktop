export const MSG = {
  HELLO: "hello",
  ROSTER: "roster",
  MESSAGE: "message",
  SYSTEM: "system",
  CONTROL: "control",
  CONTROL_ACK: "control_ack",
  ACTIVITY: "activity",
} as const;

export type ActivityKind =
  | "idle"
  | "thinking"
  | "tool"
  | "compact"
  | "usage";

export const CONTROL_OPS = [
  "clear",
  "compact",
  "status",
  "usage",
  "mode",
  "model",
  "effort",
  "pause",
  "resume",
  "kill",
] as const;
export type ControlOp = (typeof CONTROL_OPS)[number];

export type Role = "human" | "agent";

export const DEFAULT_ROOM = "default";

export interface Participant {
  name: string;
  role: Role;
  room: string;
}

export interface HelloMsg {
  type: "hello";
  name: string;
  role: Role;
  room?: string; // defaults to DEFAULT_ROOM on the hub side
}

export interface ChatMsg {
  type: "message";
  from: string;
  content: string;
  mentions: string[];
  ts: number;
  room: string;
}

export interface OutgoingMsg {
  type: "message";
  content: string;
}

export interface RosterMsg {
  type: "roster";
  participants: Participant[];
}

export interface SystemMsg {
  type: "system";
  text: string;
  participants?: Participant[];
  room?: string;
}

export interface ControlMsg {
  type: "control";
  target: string;
  op: ControlOp;
  arg?: string;
  from?: string;
  room?: string;
}

export interface ControlAckMsg {
  type: "control_ack";
  target: string;
  op: ControlOp;
  from: string;
  ok: boolean;
  info?: string;
  ts: number;
  room: string;
}

export interface ActivityMsg {
  type: "activity";
  name: string;
  kind: ActivityKind;
  tool?: string;
  ts: number;
  room: string;
}

export type ServerMsg =
  | ChatMsg
  | RosterMsg
  | SystemMsg
  | ControlMsg
  | ControlAckMsg
  | ActivityMsg;
export type ClientMsg =
  | HelloMsg
  | OutgoingMsg
  | ControlMsg
  | ControlAckMsg
  | ActivityMsg;

export const MENTION_ALL = "all";

export const newMentionRegex = () =>
  /@([A-Za-z][A-Za-z0-9_-]*)(?![\w.\-/~])/g;

export function parseMentions(
  text: string,
  validNames?: Set<string>,
): string[] {
  const names = new Set<string>();
  const re = newMentionRegex();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = m[1];
    if (n === MENTION_ALL) {
      names.add(MENTION_ALL);
    } else if (!validNames || validNames.has(n)) {
      names.add(n);
    }
  }
  return [...names];
}

export function encode(obj: unknown): string {
  return JSON.stringify(obj);
}

export function decode<T = unknown>(buf: string | Buffer): T {
  return JSON.parse(typeof buf === "string" ? buf : buf.toString()) as T;
}
