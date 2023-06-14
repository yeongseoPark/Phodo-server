const mongoose = require('mongoose');

const EdgeSchema = mongoose.Schema({
    source: {
        type: Number,
        required: true
    },
    target: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Edges', EdgeSchema);
