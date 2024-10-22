import { readdirSync } from 'fs';
import { join } from 'path';

const loadFunctions = async () => {
    const functions = {};
    const files = readdirSync(join(process.cwd(), './functions'));

    for (const file of files) {
        if (file.endsWith('.js')) {
            const functionName = file.replace('.js', '');
            // Destructure only the execute function
            const { execute } = await import(join(process.cwd(), './functions', file));
            functions[functionName] = execute; // Store only the execute function
        }
    }

    return functions;
};

// Usage example
const execute = async (functionCalls) => {
    const results = [];
    const functions = await loadFunctions(); // Load functions dynamically

    for (const { functionName, parameters } of functionCalls) {
        if (functions[functionName]) {
            try {
                const result = await functions[functionName](...parameters);
                results.push({ functionName, result });
            } catch (error) {
                results.push({ functionName, error: error.message });
            }
        } else {
            results.push({ functionName, error: 'Function not found' });
        }
    }

    return results;
};

const details = {
    type: "function",
    function: {
        name: 'executeFunctions',
        parameters: {
            type: 'object',
            properties: {
                functionCalls: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            functionName: {
                                type: 'string',
                                description: 'The name of the function to execute.'
                            },
                            parameters: {
                                type: 'array',
                                description: 'An array of parameters to pass to the function.'
                            }
                        },
                        required: ['functionName', 'parameters']
                    },
                    description: 'An array of function calls, each containing the function name and its parameters.'
                }
            },
            required: ['functionCalls']
        },
    },
    description: 'This function executes multiple functions based on the provided functionCalls array. It could also call a function more then once.'
};

export { execute, details };