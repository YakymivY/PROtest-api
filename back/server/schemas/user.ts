const mong = require('mongoose');

const UserSchema = new mong.Schema({
    email: {
        type: String,
        required: true
    }, 
    password: {
        type: String,
        required: true
    },
    role: {
        type: String, 
        required: true
    }
}, { collection: 'user' });

const User = mong.model('User', UserSchema);

module.exports = User;