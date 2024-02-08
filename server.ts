import cors from 'cors';

if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}


const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

//DATABASE
mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost:27017/angulardb');

let MyUser = require('./schemas/user');
let MyTest = require('./schemas/test');
let MyAnswers = require('./schemas/answers');
let MyDiscipline = require('./schemas/disciplines');
//


app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(flash());
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(cors());

//token middleware
app.use('/api', authenticateToken);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'berk.keytret@gmail.com',
        pass: 'rywauddjwfysslzp'
    }
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    
    const response = await MyUser.findOne({email});

    if(!response) {
        res.json({status: "incorrect"});
        return
    }

    const resp = await bcrypt.compare(password, response.password);

    if (!resp) {
        //user login incorrect
        console.log("Incorrect details");
        res.json({status: "incorrect"});
    } else {
        //make a session and set user to logged in
        const username = response.username;
        const userId = response._id;
        const role = response.role;
        const solved = response.solved;
        const user = {
            email: email,
            name: username,
            id: userId,
            role: role,
            solved: solved
        }
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
        response.token = accessToken;
        if (response.role == "teacher") {
            res.status(200).json({ redirect: '/teacher', response, token: accessToken });
        } else {
            res.status(200).json({ redirect: '/student', response, token: accessToken });
        }
    }
});

app.post('/register', async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const username = req.body.name;
        const role = req.body.role;
        const hashedPassword = await bcrypt.hash(password, 10);

        const response = await MyUser.findOne({email});
        if (response) {
            res.json({status: "incorrect"});
        } else {
            const user = new MyUser({
                email: email,
                password: hashedPassword,
                username: username,
                role: role
            });
            const result = await user.save();

            res.json("success");
        }
    } catch {
        res.json("some error");
    }
});


function authenticateToken (req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}


//FIND TESTNAME
app.get('/api/find-testname', async (req, res) => {
    const name = req.query.name;
    const discipline = req.query.discipline;
    const response = await MyTest.findOne({ name: name, disciplineId: discipline });
    res.json(response);
});

//TEST CONSTRUCTOR
app.post('/api/test', async (req, res) => {
    //creating new test in db
    const data = req.body.tests;
    const name = req.body.name;
    const time = req.body.time;
    const disciplineId = req.body.disciplineId;
    const myTests = new MyTest ({
        tests: data,
        name: name,
        time: time,
        disciplineId: disciplineId
    });
    const result = await myTests.save();

    //adding test to discipline tests list
    const filter = { _id: disciplineId };
    const update = { $push: { tests: myTests._id } };
    MyDiscipline.updateOne(filter, update).then((result) => {
        console.log('Value added to array successfully');
    })
    .catch((err) => {
        console.error('Failed to update document:', err);
    });

    //sending the result
    res.json({
        result
    });
});

//GET TEST
app.get('/api/solve', async (req, res) => {
    const testId = req.query.id;
    const response = await MyTest.findOne({ _id: testId });
    res.json({
        tests: response.tests,
        time: response.time,
        id: response._id
    });
});

//PUSH ANSWERS
app.post('/api/answers', async (req, res) => {
    const userId = req.body.userId;
    const testId = req.body.testId;
    const answers = req.body.answers;
    const mark = req.body.mark;

    const newAnswer = new MyAnswers ({
        userId: userId,
        testId: testId,
        answers: answers,
        mark: mark
    });
    const result = await newAnswer.save();

    //send email
    const user = await MyUser.findOne({ _id: userId });
    const mailOptions = {
        from: 'berk.keytret@gmail.com',
        to: user.email,
        subject: 'Results of PROtest',
        text: 'Your mark is ' + mark + '%' 
    };
    await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    //mark as solved
    const filter = { _id: userId };
    const update = { $push: { solved: [testId, mark] } };
    MyUser.updateOne(filter, update).then((result) => {
        console.log('Value added to array successfully');
    })
    .catch((err) => {
        console.error('Failed to update document:', err);
    });
    res.json({result});
});

//GET DISCIPLINE
app.get('/api/get-discipline', async (req, res) => {
    const userId = req.query.id;
    const role = req.query.role;
    if (role === "teacher") {
        const response = await MyDiscipline.find({teacher: userId});

        const disciplines = await MyDiscipline.find({ _id: { $in: response } });
        let testsArray = [];
        let userArray = [];
        for (let discipline of disciplines) {
            const getUser = await MyUser.find({ _id: { $in: discipline.students }});
            const getTest = await MyTest.find({ _id: { $in: discipline.tests } });
            userArray.push(getUser);
            testsArray.push(getTest);
        }

        res.json({disciplines: response, tests: testsArray, students: userArray});
    } else {
        const user = await MyUser.findOne({_id: userId});
        const response = user.disciplines;
        const disciplines = await MyDiscipline.find({ _id: { $in: response } });

        //getting tests of disciplines
        let testsArray = [];
        for (let discipline of disciplines) {
            const getTest = await MyTest.find({ _id: { $in: discipline.tests } });
            testsArray.push(getTest);
        }

        //get solved array
        const solved = user.solved;
        res.json({disciplines: disciplines, tests: testsArray, solved: solved});
    }
});

//PUSH DISCIPLINE
app.post('/api/add-discipline', async (req, res) => {
    const name = req.body.name;
    const userId = req.user.id;
    
    try {
        const found = await MyDiscipline.findOne({name: name, teacher: userId});
        if (found) {
            res.json({status: "error"})
        } else {
            const discipline = new MyDiscipline({
                name: name,
                teacher: userId
            });
            const result = await discipline.save();

            res.json({status: "success"});
        }
        
    } catch {
        res.json({status: "error"});
    }
    
});

//ADD STUDENT
app.post('/api/add-student', async (req, res) => {
    const email = req.body.email;
    const disciplineId = req.body.disciplineId;
    const student = await MyUser.findOne({email, role: "student"});
    if (!student) {
        res.json({status: "no such user"});
    } else {
        const studentId = student._id;
        const disciplinesArray = student.disciplines;
        if (disciplinesArray.includes(disciplineId)) {
            res.json({status: "added"});
        } else {
            //adding student to disipline students list
            const filter = { _id: disciplineId };
            const update = { $push: { students: studentId } };
            MyDiscipline.updateOne(filter, update).then((result) => {
                console.log('Value added to array successfully');
            })
            .catch((err) => {
                console.error('Failed to update document:', err);
            });

            //adding discipline to student disciplines list
            const filter2 = { _id: studentId };
            const update2 = { $push: { disciplines: disciplineId } };
            MyUser.updateOne(filter2, update2).then((result) => {
                console.log('Value added to array successfully');
            })
            .catch((err) => {
                console.error('Failed to update document:', err);
            });
            res.json(student);
        }
    }
});

app.listen(3000);