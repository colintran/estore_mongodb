const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
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
    console.log("email: %s, password: %s",email,password);
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