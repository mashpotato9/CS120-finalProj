const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.options('*', cors());
app.use(express.json());
app.use(express.static(__dirname));

const uri = "mongodb+srv://cs120:980708@cluster0.glyxwiq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});

const placeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    address: String,
    placeId: String
});

const User = mongoose.model('User', userSchema);
const Place = mongoose.model('Place', placeSchema);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, 'your_jwt_secret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            password: hashedPassword
        });
        await user.save();
        res.status(201).send('User registered successfully');
    } catch (error) {
        res.status(500).send('Error registering user');
    }
});

app.post('/auth/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.status(400).send('Invalid credentials');
    }
});

app.get('/auth/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        res.status(500).send('Error retrieving user information');
    }
});

app.post('/places/save', authenticateToken, async (req, res) => {
    try {
        const place = new Place({
            user: req.user.userId,
            name: req.body.name,
            address: req.body.address,
            placeId: req.body.placeId
        });
        await place.save();
        res.status(201).send('Place saved successfully');
    } catch (error) {
        res.status(500).send('Error saving place');
    }
});

app.get('/places/saved', authenticateToken, async (req, res) => {
    try {
        const places = await Place.find({ user: req.user.userId });
        res.json(places);
    } catch (error) {
        res.status(500).send('Error retrieving saved places');
    }
});

app.delete('/places/delete/:id', authenticateToken, async (req, res) => {
    try {
        const result = await Place.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
        if (result) {
            res.status(200).send('Place deleted successfully');
        } else {
            res.status(404).send('Place not found');
        }
    } catch (error) {
        res.status(500).send('Error deleting place');
    }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));