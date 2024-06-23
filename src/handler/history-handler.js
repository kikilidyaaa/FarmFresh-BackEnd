const express = require('express');
const admin = require('firebase-admin');
require('dotenv').config();

const historyHandler = express.Router();

historyHandler.get('/history', async (req, res) => {
  try {
    const checkoutSnapshot = await admin.firestore().collection('checkout').get();
    if (checkoutSnapshot.empty) {
      return res.status(404).json({ error: 'Tidak ada riwayat checkout ditemukan' });
    }

    const history = checkoutSnapshot.docs.map(doc => {
      const data = doc.data();
      const itemCount = data.items.length;

      return {
        checkoutId: doc.id,
        name: data.customer.name,
        totalItem: itemCount,
        totalPrice: data.total,
        shippingName: data.shipping.name,
        address: data.shipping.address
      };
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Kesalahan mengambil riwayat checkout:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

module.exports = historyHandler;
