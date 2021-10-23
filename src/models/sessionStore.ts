import { Dispose } from './processorContext';
import { UserSession } from './userSession';

export interface SessionStore {
  reset(): Promise<void>;
  getUserSession(id: string): UserSession | undefined;
  setUserSession(userSession: UserSession): void;
  removeUserSession(id: string): void;
  onSessionChanged(listener: () => void): Dispose;
}
