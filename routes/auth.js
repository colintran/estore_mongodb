const path = require('path');

const express = require('express');

const authController = require('../controllers/auth');

const router = express.Router();

router.post('/login', authController.postLogin);
router.get('/login', authController.getLogin);
router.post('/logout', authController.postLogout);
router.get('/signup', authController.getSignUp);
router.post('/signup', authController.postSignUp);
router.get('/resetPassword', authController.getResetPassword);
router.get('/resetPassword/:token', authController.getSetNewPassword);
router.post('/resetPassword', authController.postResetPassword);
router.post('/setPassword', authController.postSetNewPassword);

module.exports = router;