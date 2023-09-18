import { Dispose, SessionStore, UserSession } from '../models';

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

  getUserSession<T extends UserSession>(id: string): T | undefined {
    return this.userSessions.find(obj => obj.id === id) as T;
  }

  setUserSession<T extends UserSession>(userSession: T): void {
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
      this.userSessions.splice(this.userSessions.indexOf(userSession), 1);
      if (userSession.delete) {
        userSession.delete();
      }
      this.notifySessionChanged();
    }
  }

  isUserSession(obj: unknown): obj is UserSession {
    const session = obj as UserSession;
    return session && !!session.description && !!session.id && !!session.title && !!session.type && !!session.details;
  }
}

export const userSessionStore = new UserSessionStore();
