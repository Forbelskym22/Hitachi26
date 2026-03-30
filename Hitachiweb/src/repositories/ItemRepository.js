const Item = require('../models/Item');

// In-memory store — swap for a real DB adapter later
let store = [];
let nextId = 1;

class ItemRepository {
  findAll() {
    return [...store];
  }

  findById(id) {
    return store.find((item) => item.id === id) ?? null;
  }

  create(data) {
    const item = new Item({ ...data, id: nextId++ });
    store.push(item);
    return item;
  }

  update(id, data) {
    const index = store.findIndex((item) => item.id === id);
    if (index === -1) return null;
    store[index] = new Item({ ...store[index], ...data, id });
    return store[index];
  }

  delete(id) {
    const index = store.findIndex((item) => item.id === id);
    if (index === -1) return false;
    store.splice(index, 1);
    return true;
  }
}

module.exports = new ItemRepository();
