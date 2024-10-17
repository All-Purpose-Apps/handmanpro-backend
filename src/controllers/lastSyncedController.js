import LastSynced from '../models/LastSynced.js';

const getLastSynced = async (req, res) => {
  try {
    const lastSynced = await LastSynced.find();
    if (lastSynced.length === 0) {
      //create a new lastSynced record
      const newLastSynced = new LastSynced();
      await newLastSynced.save();
      return res.json(newLastSynced);
    }
    res.json(lastSynced);
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

const updateLastSynced = async (req, res) => {
  const { id } = req.params;
  try {
    const updateSync = Date.now();
    let lastSynced = await LastSynced.findByIdAndUpdate(id, { lastSyncedAt: updateSync }, { new: true });
    if (!lastSynced) {
      return res.status(404).json({ msg: 'LastSynced not found' });
    }
    const lastSyncedResult = await LastSynced.find();
    res.json(lastSyncedResult);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server Error');
  }
};

export { getLastSynced, updateLastSynced };
