require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const app = express();

// ----- Database -----------------------------------------------------------
// Quick Match works with no database. The tournament features need MongoDB.
let dbReady = false;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose
        .connect(MONGODB_URI)
        .then(() => {
            dbReady = true;
            console.log('MongoDB connected — tournament features enabled.');
        })
        .catch((err) => {
            console.warn('MongoDB connection failed — running in Quick Match only mode.');
            console.warn('Reason:', err.message);
        });
} else {
    console.warn('No MONGODB_URI set — running in Quick Match only mode.');
    console.warn('Copy .env.example to .env to enable tournaments.');
}

// ----- Middleware ---------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const Tournament = require('./models/tournament');
const Game = require('./models/game');

// Guard: block tournament routes cleanly when the DB is unavailable.
function requireDb(req, res, next) {
    if (!dbReady) {
        return res.status(503).render('no-db');
    }
    next();
}

// ----- Home ---------------------------------------------------------------
app.get('/', async (req, res) => {
    let tournaments = [];
    if (dbReady) {
        try {
            tournaments = await Tournament.find().sort({ createdAt: -1 });
        } catch (error) {
            console.error(error);
        }
    }
    const isDeleted = req.cookies.isDeleted || false;
    res.clearCookie('isDeleted');
    res.render('index', { tournaments, isDeleted, dbReady });
});

// ----- Quick Match (temporary, no DB) -------------------------------------
// A one-off match played entirely in the browser. Nothing is persisted
// server-side — state lives in localStorage until the player clears it.
app.get('/quick', (req, res) => {
    res.render('quick');
});

// ----- Tournaments --------------------------------------------------------
app.get('/tournament/new', requireDb, (req, res) => {
    res.render('new-tournament');
});

app.post('/tournament', requireDb, async (req, res) => {
    try {
        const { name, players } = req.body;
        const playerList = (players || '')
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);

        if (!name || playerList.length < 2) {
            return res.status(400).send('A tournament needs a name and at least 2 players.');
        }

        const tournament = new Tournament({ name, players: playerList });
        await tournament.save();
        res.redirect(`/tournament/${tournament._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/tournament/:id', requireDb, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate('games');
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        res.render('tournament', { tournament });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/tournament/:id', requireDb, async (req, res) => {
    try {
        await Tournament.findByIdAndDelete(req.params.id);
        await Game.deleteMany({ tournament: req.params.id });
        res.cookie('isDeleted', true);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// ----- Random player order picker -----------------------------------------
app.get('/tournament/:id/randompicker', requireDb, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }
        res.render('randompicker', { tournament });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// ----- Games --------------------------------------------------------------
app.get('/tournament/:id/game/new', requireDb, (req, res) => {
    res.render('new-game', { tournamentId: req.params.id });
});

app.post('/tournament/:id/game', requireDb, async (req, res) => {
    try {
        const { date, time, maxpoints } = req.body;
        const game = new Game({
            tournament: req.params.id,
            date: date,
            time: time,
            maxpoints: parseInt(maxpoints, 10) || 100,
            rounds: []
        });
        await game.save();

        const tournament = await Tournament.findById(req.params.id);
        tournament.games.push(game);
        await tournament.save();

        res.redirect(`/game/${game._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/game/:id', requireDb, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id).populate('tournament');
        if (!game) {
            return res.status(404).send('Game not found');
        }
        res.render('game', { game });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/game/:id', requireDb, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (game) {
            await Tournament.findByIdAndUpdate(game.tournament, {
                $pull: { games: game._id }
            });
            await Game.findByIdAndDelete(req.params.id);
        }
        res.cookie('isDeleted', true);
        res.redirect(game ? `/tournament/${game.tournament}` : '/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Persist a finished game's rounds and mark it as played.
app.post('/game/:id/end', requireDb, async (req, res) => {
    try {
        const { rounds } = req.body;
        if (!rounds || !Array.isArray(rounds)) {
            return res.status(400).json({ success: false, message: 'Invalid rounds data' });
        }

        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        game.rounds = rounds;
        game.isNew = false;
        await game.save();

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// ----- 404 ----------------------------------------------------------------
app.use((req, res) => {
    res.status(404).render('404');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Dominoes Arena running on http://localhost:${PORT}`);
});
