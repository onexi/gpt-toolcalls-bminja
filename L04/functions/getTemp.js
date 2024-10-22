import axios from 'axios';

/**
 * Given a latitude and longitude, performs an API request to get the temperature
 * of the most recent period (period 1) as a float.
 *
 * @param {number|string} latitude - The latitude.
 * @param {number|string} longitude - The longitude.
 * @returns {Promise<number|string>} - The temperature as a float, or an error message.
 */
const execute = async (latitude, longitude) => {
    try {
        const response = await axios.get(`https://api.weather.gov/points/${latitude},${longitude}`);
        const forecastUrl = response.data.properties.forecast;
        const forecastResponse = await axios.get(forecastUrl);
        
        for (const period of forecastResponse.data.properties.periods) {
            if (period.number === 1) {
                return parseFloat(period.temperature);
            }
        }
    } catch (error) {
        console.error(error);
        return "Error";
    }
};

const details = {
    type: "function",
    function: {
        name: 'getTemp',
        parameters: {
            type: 'object',
            properties: {
                latitude: {
                    type: 'number',
                    description: 'Latitude of the location'
                },
                longitude: {
                    type: 'number',
                    description: 'Longitude of the location'
                }
            },
            required: ['latitude', 'longitude']
        },
    },
    description: 'This function retrieves the temperature for a given latitude and longitude.'
};

export { execute, details };