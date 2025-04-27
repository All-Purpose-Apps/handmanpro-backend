import express from 'express';
const router = express.Router();
import { getLowesProducts, getHomeDepotProducts } from '../controllers/unwrangleController.js';

router.get('/lowes', getLowesProducts);

router.get('/home-depot', getHomeDepotProducts);

export default router;
