const express = require('express');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const serviceAccount = require("../config/serviceAccountKey.json");
require('dotenv').config();

const registerHandler = express.Router();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://farm-fresh-d8e1b-default-rtdb.asia-southeast1.firebasedatabase.app"
});

registerHandler.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);
        if (existingUser) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }

        const user = await admin.auth().createUser({
            email,
            password,
            displayName: username,
        });

        const cartId = user.uid;
        const productId = user.uid;
        const hashedPassword = await bcrypt.hash(password, 10);

        await admin.firestore().collection('users').doc(user.uid).set({
            username,
            email,
            password: hashedPassword,
            name: '',
            address: '',
            hobbies: '',
            job: '',
            vegetables: '',
            cartId,
        });

        await admin.firestore().collection('farmers').doc(user.uid).set({
            username,
            email,
            password: hashedPassword,
            image: '',
            storeName: '',
            owner: '',
            address: '',
            country: '',
            contact: '',
            timeZone: '',
            productId,
        });

        res.status(201).json({ message: 'Registrasi berhasil', user });
    } catch (error) {
        console.error('Kesalahan saat registrasi:', error);
        res.status(500).json({ error: 'Kesalahan Server Internal' });
    }
});

module.exports = registerHandler;
