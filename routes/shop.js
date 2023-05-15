const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');

const router = express.Router();
const routeProtection = require('../middleware/is-auth');

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', routeProtection.isAuth, shopController.getCart);

router.post('/cart', routeProtection.isAuth, shopController.postCart);

router.post('/cart-delete-item', routeProtection.isAuth, shopController.postCartDeleteProduct);

router.post('/create-order', routeProtection.isAuth, shopController.postOrder);

router.get('/orders', routeProtection.isAuth, shopController.getOrders);

router.get('/orders/:orderId', routeProtection.isAuth, shopController.getInvoice);
module.exports = router;
