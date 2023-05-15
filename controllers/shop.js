const Product = require('../models/product');
const user = require('../models/user');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit');

exports.getProducts = (req, res, next) => {
  Product.find()
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products'
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  console.log("csrf token: %o",req.csrfToken());
  Product.find()
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/'
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
  .populate('cart.items.productId')
  .execPopulate()
  .then(user => {
    res.render('shop/cart', {
      path: '/cart',
      pageTitle: 'Your Cart',
      products: user.cart.items
    });
  })
  .catch(err => {
    console.log(err);
  })
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user.deleteItemFromCart(prodId);
  res.redirect('/cart');
};

exports.postOrder = (req, res, next) => {
  req.user.addOrder();
  res.redirect('/orders');
};

exports.getOrders = (req, res, next) => {
  let fetchedOrders;
  Order.find({userId: req.user._id})
  .then(orders => {
    fetchedOrders = orders;
    console.log('orders before populating: %o',orders);
    return Order.populate(fetchedOrders, {path: 'items.productId'});
  })
  .then(result => {
    console.log('fetched orders after population: %o',fetchedOrders);
    res.render('shop/orders', {
      path: '/orders',
      pageTitle: 'Your Orders',
      orders: fetchedOrders
    });
  })
  .catch(err => console.log(err));
};

exports.getInvoice = (req,res,next) => {
  let orderId = req.params.orderId;
  Order.findById(orderId)
  .then(order => {
    if (!order){
      console.log('error: order not exist!');
      return res.redirect('/');
    }
    // security check to ensure only user making this order can view it
    if (order.userId.toString() !== req.user._id.toString()){
      return res.status(403).render('403', {pageTitle: 'Not Authorized', path: '/403'});
    }
    return order.populate({path: 'items.productId'}).execPopulate();
  })
  .then(order => {
    console.log('order: %o',order);
    const invoiceName = 'invoice-' + orderId + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"');
    // Build invoice file
    let totalPrice = 0;
    const pdfDoc = new pdfkit();
    pdfDoc.pipe(fs.createWriteStream(path.join('data','invoices',invoiceName)));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(16).text(`======Invoice ${orderId}=========`);
    order.items.forEach(item => {
      pdfDoc.fontSize(16).text(`Product: ${item.productId.title} - Quantity: ${item.quantity} * Price: \$${item.productId.price}`);
      totalPrice += item.quantity * item.productId.price;
    })
    pdfDoc.fontSize(26).text(`Total: \$${totalPrice}`);
    pdfDoc.fontSize(16).text(`=================================`);
    pdfDoc.end();
  })
  .catch(err => {
    console.log('err: %o',err);
    res.redirect('/');
  }) 
};