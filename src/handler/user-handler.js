const express = require('express');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const multer = require('multer');
require('dotenv').config();

const userHandler = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

userHandler.get('/users', async (req, res) => {
  try {
    const users = await admin.firestore().collection('users').get();
    const userList = [];
    users.forEach((user) => {
      userList.push({
        idUser: user.id,
        name: user.data().name,
        image: user.data().image,
        username: user.data().username,
        email: user.data().email,
        address: user.data().address,
        hobbies: user.data().hobbies,
        job: user.data().job,
        vegetables: user.data().vegetables,
        cartId: user.data().cartId,
      });
    });
    res.status(200).json(userList);
  } catch (error) {
    console.error('Kesalahan mengambil user:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

userHandler.get('/profiles' , async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return res.status(401).json({ error: 'Token tidak tersedia' });
        }

        const accessToken = authorizationHeader.replace('Bearer ', '');
        const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        const user = userDoc.data();

        res.status(200).json(user);
    } catch (error) {
        console.error('Kesalahan mendapatkan data pengguna:', error);
        res.status(500).json({ error: 'Kesalahan Server Internal' });
    }
});

userHandler.put('/profiles', upload.single('image'), async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return res.status(401).json({ error: 'Token tidak tersedia' });
        }

        const accessToken = authorizationHeader.replace('Bearer ', '');
        const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        const { name, address, hobbies, job, vegetables, username, email } = req.body;
        const file = req.file;

        let imageUrl;

        if (file) {
            const fileName = `${Date.now()}_${file.originalname}`;
            const bucket = admin.storage().bucket('farm-fresh-d8e1b.appspot.com');

            const fileUpload = bucket.file(fileName);
            await fileUpload.save(file.buffer, {
                metadata: {
                    contentType: file.mimetype,
                },
            });

            imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
        }

        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        const existingUserData = userDoc.data();

        const updatedUserData = {
            name: name || existingUserData.name,
            username: username || existingUserData.username,
            email: email || existingUserData.email,
            address: address || existingUserData.address,
            hobbies: hobbies || existingUserData.hobbies,
            job: job || existingUserData.job,
            vegetables: vegetables || existingUserData.vegetables,
            image: imageUrl || existingUserData.image,
        };

        Object.keys(updatedUserData).forEach(key => {
            if (updatedUserData[key] === undefined) {
                delete updatedUserData[key];
            }
        });

        await admin.firestore().collection('users').doc(userId).update(updatedUserData);

        res.status(200).json({ message: 'Profil berhasil diperbarui' });
    } catch (error) {
        console.error('Kesalahan memperbarui profil pengguna:', error);
        res.status(500).json({ error: 'Kesalahan Server Internal' });
    }
});

userHandler.delete('/profiles', async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return res.status(401).json({ error: 'Token tidak tersedia' });
        }

        const accessToken = authorizationHeader.replace('Bearer ', '');
        const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        const user = userDoc.data();
        const imageUrl = user.image;

        if (imageUrl) {
            const fileName = imageUrl.split('/').pop().split('?')[0];
            const file = admin.storage().bucket().file(`user_images/${fileName}`);
            await file.delete();
        }

        await admin.firestore().collection('users').doc(userId).delete();
        await admin.auth().deleteUser(userId);

        res.status(200).json({ message: 'User berhasil dihapus' });
    } catch (error) {
        console.error('Kesalahan menghapus pengguna:', error);
        res.status(500).json({ error: 'Kesalahan Server Internal' });
    }
});

module.exports = userHandler;
