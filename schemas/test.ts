import mongoose from 'mongoose';

const TestSchema = new mongoose.Schema({
    tests: [
        {
            question: String,
            answers: [String],
            correct: Number
        }
    ],
    name: String,
    time: Number,
    disciplineId: mongoose.Types.ObjectId
}, { collection: 'tests' });

const Test = mongoose.model('tests', TestSchema);

module.exports = Test;