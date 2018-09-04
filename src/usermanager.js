import User from './user';

class UserManager {
  constructor() {
    this.users = new Map();
  }

  getUser(name, oauth) {
    const id = `${name}:${oauth}`;
    let user = this.users.get(id);
    if (!user) {
      user = new User(name, oauth);
      this.users.set(id, user);
    }
    return user;
  }
}

const userManager = new UserManager();
export default userManager;
