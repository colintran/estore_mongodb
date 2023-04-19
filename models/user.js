const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    cart: {
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true
                }
            }
        ]
    }
});

const Order = require('../models/order');
userSchema.methods.addToCart = function(product){
    let id = this.cart.items.findIndex(item => {
        return item.productId.toString() == product._id.toString();
    });
    if (id == -1){
        this.cart.items.push({productId: product._id, quantity: 1});
    } else {
        this.cart.items[id].quantity += 1;
    }
    this.save()
};

userSchema.methods.deleteItemFromCart = function(productId) {
    const updatedCartItems = this.cart.items.filter(item => {
      return item.productId.toString() !== productId.toString();
    });
    this.cart.items = updatedCartItems;
    this.save();
}

userSchema.methods.addOrder = function(){
    // cart items => persists to order
    let order = new Order({
        items: this.cart.items,
        userId: this._id // this will work as well thanks to mongoose
    })
    order.save();
    // empty cart
    this.cart.items = [];
    this.save();
}
module.exports = mongoose.model('User', userSchema);
