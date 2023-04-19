const User = require('../models/user');

exports.getLogin = (req,res,next) => {
    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        isAuthenticated: false
    });
}

exports.postLogin = (req,res,next) => {
    User.findOne({email: 'cuongt6@abc.com'})
    .then(user => {
        req.session.isLoggedIn = true;
        req.session.user = user;
        console.log('user: %o',req.session.user);
        // ensure session info is persisted to DB
        req.session.save((err) => {
            if (err) {
                console.log('err: %o',err);
            }
            res.redirect('/');
        })
    })
    .catch(err => console.log(err));
}

exports.postLogout = (req,res,next) => {
    req.session.destroy((err) => {
        console.log('err: %o',err);
        res.redirect('/');
    });
}

