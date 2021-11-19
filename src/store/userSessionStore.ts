import { UserSession, SessionStore, Dispose } from '../models';

export class UserSessionStore implements SessionStore {
  readonly userSessions: Array<UserSession> = [];

  private readonly sessionChangedListener: Array<() => void> = [];

  onSessionChanged(listener: () => void): Dispose {
    this.sessionChangedListener.push(listener);

    return () => {
      const index = this.sessionChangedListener.indexOf(listener);
      if (index >= 0) {
        this.sessionChangedListener.splice(index, 1);
      }
    };
  }

  async reset(): Promise<void> {
    for (const userSession of this.userSessions) {
      if (userSession.delete) {
        userSession.delete();
      }
    }
    this.userSessions.length = 0;
    this.notifySessionChanged();
  }

  getUserSession(id: string): UserSession | undefined {
    return this.userSessions.find(obj => obj.id === id);
  }

  setUserSession(userSession: UserSession): void {
    this.removeUserSession(userSession.id);
    this.userSessions.push(userSession);
    this.notifySessionChanged();
  }

  private notifySessionChanged() {
    for (const listener of this.sessionChangedListener) {
      listener();
    }
  }

  removeUserSession(id: string): void {
    const userSession = this.userSessions.find(obj => obj.id === id);
    if (userSession) {
      if (userSession.delete) {
        userSession.delete();
      }
      this.userSessions.splice(this.userSessions.indexOf(userSession), 1);
      this.notifySessionChanged();
    }
  }

  isUserSession(obj: unknown): obj is UserSession {
    const session = obj as UserSession;
    return session && !!session.description && !!session.id && !!session.title && !!session.type && !!session.details;
  }
}

export const userSessionStore = new UserSessionStore();
