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
    username: String,
    role: {
        type: String, 
        required: true
    },
    token: String,
    disciplines: [],
    solved: []
}, { collection: 'user' });

const User = mong.model('User', UserSchema);

module.exports = User;