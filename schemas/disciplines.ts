const mongoose = require('mongoose');

const DisciplineSchema = new mongoose.Schema({
    name: String,
    teacher: mongoose.Types.ObjectId,
    students: [],
    tests: []
}, { collection: 'disciplines' });

const Discipline = mongoose.model('Discipline', DisciplineSchema);

module.exports = Discipline;