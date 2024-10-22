import axios from 'axios';

/**
 * Fetches a random dad joke from the icanhazdadjoke API.
 *
 * @returns {Promise<string>} - A random dad joke or an error message.
 */
const execute = async () => {
    try {
        const response = await axios.get('https://icanhazdadjoke.com/', {
            headers: {
                'Accept': 'application/json'
            }
        });
        return response.data.joke;
    } catch (error) {
        console.error(error);
        return "Error fetching dad joke.";
    }
};

const details = {
    type: "function",
    function: {
        name: 'getDadJoke',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        },
    },
    description: 'This function retrieves a random dad joke from the icanhazdadjoke API.'
};

export { execute, details };
