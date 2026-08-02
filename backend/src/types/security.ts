export interface AuthContext {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
}
