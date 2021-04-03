import {  UserSession } from '../models';


class UserSessionStore {

  readonly userSessions: Array<UserSession> = [];


  async reset() {
    for (const userSession of this.userSessions) {
      if (userSession.logout) {
        userSession.logout();
      }
    }
    this.userSessions.length = 0;
  }

  getUserSession(id: string) {
    return this.userSessions.find(obj => obj.id === id);
  }

  setUserSession(userSession: UserSession) {
    this.removeUserSession(userSession.id);
    this.userSessions.push(userSession);
  }

  removeUserSession(id: string) {
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