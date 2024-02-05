import mongoose from 'mongoose';

const answersSchema = new mongoose.Schema({
    userId: mongoose.Types.ObjectId,
    testId: mongoose.Types.ObjectId,
    answers: [],
    mark: Number
}, { collection: 'answers' });

const Answers = mongoose.model('answers', answersSchema);

module.exports = Answers;