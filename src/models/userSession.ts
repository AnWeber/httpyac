export interface UserSession {
  id: string;
  title: string;
  description: string;
  logout?: () => void;
}

export interface SessionStore {
  reset(): Promise<void>;
  getUserSession(id: string): UserSession | undefined;
  setUserSession(userSession: UserSession): void;
  removeUserSession(id: string): void;
}
