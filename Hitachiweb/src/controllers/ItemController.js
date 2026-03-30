const itemService = require('../services/ItemService');

class ItemController {
  getAll(req, res, next) {
    try {
      res.json(itemService.getAll());
    } catch (err) {
      next(err);
    }
  }

  getById(req, res, next) {
    try {
      res.json(itemService.getById(req.params.id));
    } catch (err) {
      next(err);
    }
  }

  create(req, res, next) {
    try {
      const item = itemService.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }

  update(req, res, next) {
    try {
      res.json(itemService.update(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  }

  delete(req, res, next) {
    try {
      itemService.delete(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ItemController();
