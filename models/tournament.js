const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    players: {
        type: [String],
        required: true
    },
    games: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
