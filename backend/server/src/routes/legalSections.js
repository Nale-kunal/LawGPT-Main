import express from 'express';
import LegalSection from '../models/LegalSection.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const filter = q
    ? {
        $or: [
          { sectionNumber: { $regex: q, $options: 'i' } },
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { actName: { $regex: q, $options: 'i' } },
          { keywords: { $elemMatch: { $regex: q, $options: 'i' } } },
        ],
      }
    : {};
  const items = await LegalSection.find(filter).limit(200);
  res.json(items);
});

export default router;



