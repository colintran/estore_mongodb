const path = require('path');
const express = require('express');
const adminController = require('../controllers/admin');
const router = express.Router();
const routeProtection = require('../middleware/is-auth');

// // /admin/add-product => GET
router.get('/add-product', routeProtection.isAuth, adminController.getAddProduct);

// // /admin/products => GET
router.get('/products', routeProtection.isAuth, adminController.getProducts);

// // /admin/add-product => POST
router.post('/add-product', routeProtection.isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', routeProtection.isAuth, adminController.getEditProduct);

router.post('/edit-product', routeProtection.isAuth, adminController.postEditProduct);

router.post('/delete-product', routeProtection.isAuth, adminController.postDeleteProduct);

module.exports = router;
