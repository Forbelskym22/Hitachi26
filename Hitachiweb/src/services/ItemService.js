const itemRepository = require('../repositories/ItemRepository');

class ItemService {
  getAll() {
    return itemRepository.findAll();
  }

  getById(id) {
    const item = itemRepository.findById(Number(id));
    if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
    return item;
  }

  create(data) {
    if (!data.name) throw Object.assign(new Error('Name is required'), { status: 400 });
    return itemRepository.create(data);
  }

  update(id, data) {
    const item = itemRepository.update(Number(id), data);
    if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
    return item;
  }

  delete(id) {
    const deleted = itemRepository.delete(Number(id));
    if (!deleted) throw Object.assign(new Error('Item not found'), { status: 404 });
  }
}

module.exports = new ItemService();
