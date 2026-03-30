class Item {
  constructor({ id, name, description, createdAt = new Date() }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
  }
}

module.exports = Item;
