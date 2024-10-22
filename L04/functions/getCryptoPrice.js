import axios from 'axios';

/**
 * Retrieves the price of a cryptocurrency by its ID from the CoinCap API.
 *
 * @param {string} id - The ID of the cryptocurrency (e.g., 'bitcoin', 'ethereum').
 * @returns {Promise<number|string>} - The price in USD as a float, or a message if the ID is not found.
 */
const execute = async (id) => {
    try {
        const response = await axios.get('https://api.coincap.io/v2/assets');
        const assets = response.data.data;

        const asset = assets.find(asset => asset.id === id);
        if (asset) {
            return parseFloat(asset.priceUsd);
        } else {
            return `Cryptocurrency with ID "${id}" could not be found.`;
        }
    } catch (error) {
        console.error(error);
        return "Error fetching data from the CoinCap API.";
    }
};

const details = {
    type: "function",
    function: {
        name: 'getCryptoPrice',
        parameters: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'The ID of the cryptocurrency (e.g., "bitcoin", "ethereum").'
                }
            },
            required: ['id']
        },
    },
    description: 'This function retrieves the price in USD for a given cryptocurrency ID from the CoinCap API.'
};

export { execute, details };