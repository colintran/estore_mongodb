const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const MONGO_URL = 'mongodb://localhost:27017/odm_db';
const errorController = require('./controllers/error');
const csrf = require('csurf');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const user = require('./models/user');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const store = new mongoDBStore({
  uri: MONGO_URL,
  collection: 'sessions'
});

app.use(session({
  secret: 'something',
  resave: false,
  saveUninitialized: false,
  store: store
}));

// this middleware is to generate csrf token and prevent csrf attack
const csrfProtection = csrf();
app.use(csrfProtection);

// fetch user from current session
const User = require('./models/user');
app.use((req,res,next) => {
  if (!req.session.user) return next();
  User.findById(req.session.user._id)
  .then(user => {
    req.user = user;
    next();
  })
  .catch(err => console.log(err));
});

app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose
  .connect(MONGO_URL)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
