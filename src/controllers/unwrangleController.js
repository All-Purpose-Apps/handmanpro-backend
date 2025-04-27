import axios from 'axios';

const getLowesProducts = async (req, res) => {
  const { search } = req.query;
  if (search) {
    try {
      const response = await axios.get(
        `https://data.unwrangle.com/api/getter/?platform=lowes_search&search=${search}&page=1&api_key=${process.env.UNWRANGLE_API_KEY}`
      );
      return res.json(response.data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

const getHomeDepotProducts = async (req, res) => {
  const { search } = req.query;
  if (search) {
    try {
      const response = await axios.get(
        `https://data.unwrangle.com/api/getter/?platform=homedepot_search&search=${search}&page=1&api_key=${process.env.UNWRANGLE_API_KEY}`
      );
      return res.json(response.data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

export { getLowesProducts, getHomeDepotProducts };
