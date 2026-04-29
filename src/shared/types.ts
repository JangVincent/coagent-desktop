// Shared types used by both main process and renderer

export interface AgentSpec {
  name: string;
  cwd: string;
  room: string;
  model?: string;
  status: "starting" | "running" | "exited";
}

export interface RoomSpec {
  id: string;      // unique room name (used in protocol)
  label: string;   // display name
}

export interface PastSession {
  sid: string;
  mtimeMs: number;
  preview: string;
  turns: number;
}

export interface SpawnAgentOpts {
  name: string;
  cwd: string;
  room: string;
  model?: string;
  resumeSessionId?: string;
}

export interface CoagentAPI {
  getHubPort(): Promise<{ port: number }>;
  getSelfName(): Promise<{ name: string }>;
  setSelfName(name: string): Promise<void>;
  pickFolder(): Promise<{ path: string | null }>;
  listSessions(cwd: string): Promise<{ sessions: PastSession[] }>;
  spawnAgent(spec: SpawnAgentOpts): Promise<{ ok: boolean; error?: string }>;
  killAgent(name: string): Promise<{ ok: boolean }>;
  listAgents(): Promise<{ agents: AgentSpec[] }>;
  onAgentStatus(
    cb: (data: { name: string; status: AgentSpec["status"]; code?: number }) => void,
  ): () => void;
  onAgentLog(
    cb: (data: { name: string; stream: "stdout" | "stderr"; line: string }) => void,
  ): () => void;
}
