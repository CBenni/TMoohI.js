export default class Channel {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.connection = null;
    this.referenceCount = 0;
  }
}
