const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
require('dotenv').config();

const farmHandler = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

farmHandler.get('/farmers', async (req, res) => {
  try {
    const farms = await admin.firestore().collection('farmers').get();
    const farmList = [];
    farms.forEach((farm) => {
      farmList.push({
        idFarm: farm.id,
        username: farm.data().username,
        storeName: farm.data().storeName,
        email: farm.data().email,
        image: farm.data().image,
        owner: farm.data().owner,
        address: farm.data().address,
        country: farm.data().country,
        contact: farm.data().contact,
        timeZone: farm.data().timeZone,
      });
    });
    res.status(200).json(farmList);
  } catch (error) {
    console.error('Kesalahan mengambil pertanian:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

farmHandler.get('/farmers/:id', async (req, res) => {
  try {
    const farmId = req.params.id;
    const farm = await admin.firestore().collection('farmers').doc(farmId).get();
    if (!farm.exists) {
      return res.status(404).json({ error: 'Pertanian tidak ditemukan' });
    }
    res.status(200).json({
      idFarm: farm.id,
      username: farm.data().username,
      storeName: farm.data().storeName,
      email: farm.data().email,
      image: farm.data().image,
      owner: farm.data().owner,
      address: farm.data().address,
      country: farm.data().country,
      contact: farm.data().contact,
      timeZone: farm.data().timeZone,
    });
  } catch (error) {
    console.error('Kesalahan mengambil Pertanian:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

farmHandler.post('/farmers/uploadImage', upload.single('image'), async (req, res) => {
  try {
    const { farmId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const bucket = admin.storage().bucket('farm-fresh-d8e1b.appspot.com');

    const fileUpload = bucket.file(fileName);
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    const farmDoc = admin.firestore().collection('farmers').doc(farmId);
    await farmDoc.update({ image: imageUrl });

    res.status(200).json({ message: 'Profile image uploaded and updated successfully', imageUrl });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

farmHandler.post('/farmers', async (req, res) => {
  try {
    const { storeName, owner, address, country, contact, timeZone, imageUrl } = req.body;

    const farm = await admin.firestore().collection('farmers').add({
      storeName,
      owner,
      address,
      country,
      contact,
      timeZone,
      image: imageUrl,
    });

    res.status(201).json({ message: 'Pertanian berhasil ditambahkan', id: farm.id });
  } catch (error) {
    console.error('Kesalahan menambahkan Pertanian:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

farmHandler.put('/farmers/:id', async (req, res) => {
  try {
    const farmId = req.params.id;
    const { username, storeName, email, owner, address, country, contact, timeZone, imageUrl } = req.body;

    const farmDoc = await admin.firestore().collection('farmers').doc(farmId).get();
    if (!farmDoc.exists) {
      return res.status(404).json({ error: 'Pertanian tidak ditemukan' });
    }

    const existingFarmData = farmDoc.data();

    const updatedFarmData = {
      storeName: storeName || existingFarmData.storeName,
      username: username || existingFarmData.username,
      email: email || existingFarmData.email,
      owner: owner || existingFarmData.owner,
      address: address || existingFarmData.address,
      country: country || existingFarmData.country,
      contact: contact || existingFarmData.contact,
      timeZone: timeZone || existingFarmData.timeZone,
      image: imageUrl || existingFarmData.image,
    };

    Object.keys(updatedFarmData).forEach(key => {
      if (updatedFarmData[key] === undefined) {
        delete updatedFarmData[key];
      }
    });

    await admin.firestore().collection('farmers').doc(farmId).update(updatedFarmData);

    if (email && email !== existingFarmData.email) {
      const user = await admin.auth().getUserByEmail(existingFarmData.email);
      await admin.auth().updateUser(user.uid, { email: email });
    }

    res.status(200).json({ message: 'Pertanian berhasil diperbarui' });
  } catch (error) {
    console.error('Kesalahan memperbarui pertanian:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

farmHandler.delete('/farmers/:id', async (req, res) => {
  try {
    const farmId = req.params.id;
    const farm = await admin.firestore().collection('farmers').doc(farmId).delete();
    res.status(200).json({ message: 'Pertanian berhasil dihapus' });
  } catch (error) {
    console.error('Kesalahan menghapus pertanian:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

module.exports = farmHandler;