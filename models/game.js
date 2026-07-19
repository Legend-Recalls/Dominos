const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    rounds: {
        type: [[Number]],
        default: []
    },
    maxpoints: {
        type: Number,
        required: true
    },
    inProgress: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema);
