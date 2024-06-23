const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
require('dotenv').config();

const loginHandler = express.Router();

loginHandler.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password harus diisi' });
        }

        const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);
        if (!existingUser) {
            return res.status(401).json({ error: 'Email atau kata sandi salah' });
        }

        const user = await admin.firestore().collection('users').doc(existingUser.uid).get();
        if (!user.exists) {
            return res.status(401).json({ error: 'User tidak ditemukan' });
        }

        const userData = user.data();
        if (!userData.password) {
            return res.status(500).json({ error: 'Kesalahan internal: password tidak ditemukan' });
        }

        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email atau kata sandi salah' });
        }

        const farm = await admin.firestore().collection('farmers').doc(existingUser.uid).get();
        const idFarm = farm.exists ? farm.id : null;

        const accessToken = jwt.sign({ userId: existingUser.uid, username: existingUser.displayName }, process.env.JWT_SECRET, { 
            expiresIn: '24h' 
        });

        res.json({
            message: 'Login berhasil',
            user: { id: existingUser.uid, username: existingUser.displayName },
            idFarm,
            accessToken,
        });
    } catch (error) {
        console.error('Kesalahan saat login:', error);
        res.status(500).json({ error: 'Kesalahan Server Internal' });
    }
});

module.exports = loginHandler;