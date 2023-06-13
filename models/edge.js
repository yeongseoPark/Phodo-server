const mongoose = require('mongoose');

const EdgeSchema = mongoose.Schema({
    edgeId: {
        type: String,
        required: true,
        unique: true
    },
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
