const Product = require('../models/product');
const user = require('../models/user');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit');
const ITEMS_PER_PAGE = 1;
const stripe = require('stripe')('sk_test_51N8rwAEMJY9tpCUwCno4KmjKUSWAr8zDezwUXxMdNoBLCuEoAPjlmTSNVA1mQCVtp6H5U0twz3yXSQpisRInvGgg002oMvYlyQ');

exports.getProducts = (req, res, next) => {
  let page = 1;
  if (req.query.page) page = parseInt(req.query.page);
  let totalNbProducts;
  Product.find()
  .countDocuments()
  .then(nbProducts => {
    totalNbProducts = nbProducts;
    Product.find()
    .skip((page-1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        totalProducts: totalNbProducts,
        currentPage: page,
        lastPage: Math.ceil(totalNbProducts / ITEMS_PER_PAGE),
        hasNextPage: page * ITEMS_PER_PAGE < totalNbProducts,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        nextPage: page + 1
      });
    })
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
  let page = 1;
  if (req.query.page) page = parseInt(req.query.page);
  let totalNbProducts;
  Product.find()
  .countDocuments()
  .then(nbProducts => {
    totalNbProducts = nbProducts;
    Product.find()
    .skip((page-1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        totalProducts: totalNbProducts,
        currentPage: page,
        lastPage: Math.ceil(totalNbProducts / ITEMS_PER_PAGE),
        hasNextPage: page * ITEMS_PER_PAGE < totalNbProducts,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        nextPage: page + 1
      });
    })
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

exports.getCheckoutSuccess = (req, res, next) => {
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

exports.getCheckout = (req,res,next) => {
  let totalPrice = 0;
  let products;
  req.user
  .populate('cart.items.productId')
  .execPopulate()
  .then(user => {
    products = user.cart.items;
    products.forEach(item => {
      totalPrice += item.quantity * item.productId.price;
    })
    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: products.map(p => {
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: p.productId.title
            },
            unit_amount: p.productId.price * 100
          },
          quantity: p.quantity
        };
      }),
      // TODO: In production, never trust the success_url this way, it could be forged in client side,
      // Instead using more secured way - webhook on server side
      success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
      cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
    });
  })
  .then(session => {
    res.render('shop/checkout',{
      pageTitle: 'Checkout',
      path: '/checkout',
      products: products,
      total: totalPrice,
      sessionId: session.id
    });
  })
  .catch(err => {
    console.log(err);
  })
};