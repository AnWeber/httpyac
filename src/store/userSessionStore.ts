import { UserSession, SessionStore } from '../models';


export class UserSessionStore implements SessionStore {

  readonly userSessions: Array<UserSession> = [];


  async reset() : Promise<void> {
    for (const userSession of this.userSessions) {
      if (userSession.logout) {
        userSession.logout();
      }
    }
    this.userSessions.length = 0;
  }

  getUserSession(id: string) : UserSession | undefined {
    return this.userSessions.find(obj => obj.id === id);
  }

  setUserSession(userSession: UserSession) : void {
    this.removeUserSession(userSession.id);
    this.userSessions.push(userSession);
  }

  removeUserSession(id: string) : void {
    const userSession = this.userSessions.find(obj => obj.id === id);
    if (userSession) {
      if (userSession.logout) {
        userSession.logout();
      }
      this.userSessions.splice(this.userSessions.indexOf(userSession), 1);
    }
  }
}

export const userSessionStore = new UserSessionStore();
