const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const productSchema = new Schema({
    title : {
        type: String,
        required: true
    },
    price : {
        type: Number,
        required: true
    },
    description : {
        type: String,
        required: true
    },
    imageUrl : {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        // Relational setup to point to User model ref
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('Product', productSchema);
