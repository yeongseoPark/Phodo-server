const mongoose = require('mongoose');

const EdgeSchema = mongoose.Schema({
    source: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
});

module.exports = mongoose.model('Edges', EdgeSchema);
