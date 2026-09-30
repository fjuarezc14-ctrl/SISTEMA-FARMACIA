const ProductModel = require('../models/product.model');
const UserModel = require('../models/user.model');
const SystemModel = require('../models/system.model');
const CashModel = require('../models/cash.model');

async function getTestProducts(req, res, next) {
  try {
    const products = await ProductModel.getAll();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    next(err);
  }
}

async function getTestUsers(req, res, next) {
  try {
    const users = await UserModel.getAll();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

async function getTestStats(req, res, next) {
  try {
    const [counts, activeShift] = await Promise.all([
      SystemModel.getStatsSummary(),
      CashModel.getOpenShift()
    ]);

    res.status(200).json({
      success: true,
      databaseEngine: 'PostgreSQL 16',
      stats: {
        totalProducts: counts.totalProducts,
        totalLots: counts.totalLots,
        totalUsers: counts.totalUsers,
        totalRoles: counts.totalRoles,
        totalCategories: counts.totalCategories,
        totalDigemid: counts.totalDigemid,
        activeCashShift: activeShift ? {
          id: activeShift.id,
          terminal: activeShift.terminal,
          openingBalance: parseFloat(activeShift.opening_balance),
          expectedBalance: parseFloat(activeShift.expected_balance),
          status: activeShift.status
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTestProducts,
  getTestUsers,
  getTestStats
};
