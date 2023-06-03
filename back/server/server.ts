if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}


const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
//DATABASE
mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost:27017/angulardb');

let MyUser = require('./schemas/user');
//
const initializePassport = require('./passport-config');
initializePassport(
    passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

const users:any = [];


app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }))
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(methodOverride('_method'));

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { name: req.user.name });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.post('/login', /*checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}),*/ async (req, res) => { //DATABASE
    const {email, password} = req.body;
    
    const response = await MyUser.findOne({email}, 'password');

    const resp = await bcrypt.compare(password, response.password);

    if (!resp) {
        //user login incorrect
        console.log("Incorrect details");
    } else {
        //make a session and set user to logged in
        console.log("Logging you in");
        res.redirect('/');
    }
});
//

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const response = await MyUser.findOne({email});
        if (response) {
            console.log("There is already a user with that email");
        } else {
        
            // users.push ({
            //     id: Date.now().toString(),
            //     name: req.body.name,
            //     email: req.body.email,
            //     password: hashedPassword
            // });
            const user = new MyUser({
                email, 
                password: hashedPassword,
                role: "teacher"
            });
            const result = await user.save();

            res.redirect('/login');
        }
    } catch {
        res.redirect('/register');
    }
});

app.delete('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

app.listen(3000);