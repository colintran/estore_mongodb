const User = require('../models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'trandinh88ama@gmail.com',
        pass: 'bzbthpqaoebqsyqb' // Gmail app password, feel free to revoke
    },
    tls : { rejectUnauthorized: false }
});

exports.getLogin = (req,res,next) => {
    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        form_error: ""
    });
}

exports.postLogin = (req,res,next) => {
    let email = req.body.email;
    let password = req.body.password;
    User.findOne({email: email})
    .then(user => {
        // authenticate
        let form_error = "";
        if (!user) {
            form_error = "User or password is not correct!"; // Security wise
            console.log("error: %s",form_error);
        } else {
            bcrypt.compare(password, user.password)
            .then(isMatched => {
                if (!isMatched) form_error = "User or password is not correct!"; // Security wise
                console.log("error: %s",form_error);
                if (form_error.trim().length != 0){
                    res.render('auth/login', {
                        pageTitle: 'Login',
                        path: '/login',
                        form_error: form_error
                    });
                    return;
                }
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
        }
    })
    .catch(err => console.log(err));
}

exports.postLogout = (req,res,next) => {
    req.session.destroy((err) => {
        console.log('err: %o',err);
        res.redirect('/');
    });
}

exports.getSignUp = (req,res,next) => {
    res.render('auth/signup', {
        pageTitle: 'Signup',
        path: '/signup',
        form_error: ""
    });
}

exports.postSignUp = (req,res,next) => {
    let email = req.body.email;
    User.findOne({email: email})
    .then(user => {
        let form_error = "";
        // check if user email exists in DB
        if (user){
            form_error = "Email already in use, please choose a different one"
        } else if (req.body.password != req.body.confirmed_pwd){
            // check password
            form_error = "Password mistmatched";
        }
        console.log('form_error: %s',form_error);
        if (form_error.trim().length != 0){
            res.render('auth/signup', {
                pageTitle: 'Signup',
                path: '/signup',
                form_error: form_error
            });
            return;
        }    
        // new email & password valid => save to DB
        bcrypt.hash(req.body.password, 12)
        .then(hashedPassword => {
            let newUser = new User({
                email: email,
                password: hashedPassword
            });
            return newUser.save();
        })
        .then(result => {
            res.redirect('/login');
            // Notification to user
            // TODO: Good for small scale request throughput, for heavy load website, recommended to have
            // a batch job (or worker processes) to asynchronously spread email to clients
            // Good refactoring lesson to involve message queue here
            return transporter.sendMail({
                to: email,
                from: "trandstore@trandcompany.com",
                subject: 'Signup succeeeded!',
                html: "<h1>You successfully signed up!</h1>"
            });
        })
        .catch(err => console.log("error: %o",err));
    })
    .catch(err => console.log(err));
}

exports.getResetPassword = (req,res,next) => {
    res.render('auth/reset',{
        pageTitle: 'Reset password',
        path: '/login'
    });
}

const TOKEN_LENGTH = 16;
exports.postResetPassword = (req,res,next) => {
    const EXPIRATION_DURATION_IN_MS = 3600000; // 1h
    email = req.body.email;
    // generate random token and send email to customer
    let token = crypto.randomBytes(Math.floor(TOKEN_LENGTH/2)).toString('hex');
    console.log('email: %s, token: %s',email, token);
    User.findOne({email: email})
    .then(user => {
        if (!user){
            console.log('Email doesnot exist');
            return res.redirect('/resetPassword');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + EXPIRATION_DURATION_IN_MS;
        return user.save();
    })
    .then(result => {
        transporter.sendMail({
            to: email,
            from: "trandstore@trandcompany.com",
            subject: 'Password reset',
            html: `
            <p> You requested a password reset </p>
                <p> Please click on <a href="http://localhost:3000/resetPassword/${token}?email=${email}">the following link</a> to set a new password, the link is effective only for 24h</p>
            `
        });
        return res.redirect('/');
    })
    .catch(err => {
        console.log(err);
    })
}
exports.getSetNewPassword = (req,res,next) => {
    let email = req.query.email;
    let token = req.params.token;
    console.log("email: %s, token: %s", email, token);
    // Check if token and email is valid (prevent feigned request)
    User.findOne({email: email})
    .then(user => {
        if(!user){
            console.log('Email not existing');
            return res.status(400).render('404', { pageTitle: 'Page Not Found', path: '/400', isAuthenticated: false });
        }
        if(user.resetToken != token){
            console.log('Token not valid');
            return res.status(400).render('404', { pageTitle: 'Page Not Found', path: '/400', isAuthenticated: false });
        }
        if(user.resetTokenExpiration < Date.now()){
            console.log('Token expired');
            return res.status(400).render('404', { pageTitle: 'Page Not Found', path: '/400', isAuthenticated: false });
        }
        return res.render('auth/set-new-password', {
            pageTitle: 'SetPassword',
            path: '/setpassword',
            email: email,
            token: token,
            form_error: ""
        });
    })
}

exports.postSetNewPassword = (req,res,next) => {
    let email = req.body.email;
    let token = req.body.token;
    User.findOne({email: email})
    .then(user => {
        let form_error = "";
        // check if user email exists in DB
        if (!user){
            console.log("Email not exist");
            return res.redirect('/');
        }
        // TODO: able to refactor to include this check in Mongo DB query
        if (user.resetToken != token || user.resetTokenExpiration < Date.now()){
            console.log("Reset Token invalid!");
            return res.redirect('/');
        }
        if (req.body.password != req.body.confirmed_pwd){
            // check password
            form_error = "Password mistmatched";
        }
        if (form_error.trim().length != 0){
            return res.render('auth/set-new-password', {
                pageTitle: 'SetPassword',
                path: '/setpassword',
                email: email,
                token: token,
                form_error: form_error
            });
        }    
        // new email & password valid => save to DB
        bcrypt.hash(req.body.password, 12)
        .then(hashedPassword => {
            user.password = hashedPassword;
            user.resetToken = undefined; // if null the field is kept still
            user.resetTokenExpiration = undefined; // if null the field is kept still
            return user.save();
        })
        .then(result => {
            return res.redirect('/login');
        })
        .then(result => {
            // Notification to user
            // TODO: Good for small scale request throughput, for heavy load website, recommended to have
            // a batch job (or worker processes) to asynchronously spread email to clients
            // Good refactoring lesson to involve message queue here
            return transporter.sendMail({
                to: email,
                from: "trandstore@trandcompany.com",
                subject: 'Your password has been reset!',
                html: "<p>You successfully reset the password</p>"
            });
        })
    })
    .catch(err => console.log("error: %o",err));
}