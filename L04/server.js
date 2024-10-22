import express from 'express';
import bodyParser from 'body-parser';
import { OpenAI} from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

// Initialize Express server
const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(process.cwd(), './public')));

// OpenAI API configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let state = {
    chatgpt:false,
    assistant_id: "",
    assistant_name: "",
    dir_path: "",
    news_path: "",
    thread_id: "",
    user_message: "",
    run_id: "",
    run_status: "",
    vector_store_id: "",
    tools:[],
    parameters: []
  };

// Default route to serve index.html for any undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), './public/index.html'));
});

async function getFunctions() {
   
    const files = fs.readdirSync(path.resolve(process.cwd(), "./functions"));
    const openAIFunctions = {};

    for (const file of files) {
        if (file.endsWith(".js")) {
            const moduleName = file.slice(0, -3);
            const modulePath = `./functions/${moduleName}.js`;
            const { details, execute } = await import(modulePath);

            openAIFunctions[moduleName] = {
                "details": details,
                "execute": execute
            };
        }
    }
    return openAIFunctions;
}

// Function to get function details by name
async function getFunctionDetails(availableFunctions, functionName) {
    return [availableFunctions.find(fn => fn.function.name === functionName)];
}

// Function to transform output
async function transformOutput(availableFunctions, previousFunction, output, targetFunctionName) {

    //console.log(`Entered transformOutput with output: ${output} and targetFunctionName: ${targetFunctionName}`);

    const messages = [
        { role: 'system', content: `You are a helpful assistant.` },
        { role: 'user', content: `Call function ${targetFunctionName} using the following information: This function ${JSON.stringify(previousFunction)} gave this output ${JSON.stringify(output)}.` }
    ];

    //console.log(`messages: ${JSON.stringify(messages)}`);
    //console.log(`GFD: ${JSON.stringify(await getFunctionDetails(availableFunctions, targetFunctionName))}`);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: await getFunctionDetails(availableFunctions, targetFunctionName)
        });
        
        //console.log(`response: ${JSON.stringify(response)}`);

        if (response?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments === undefined) {
            let parameters = response.choices[0].message.content + ' Kindly retry with new prompt.';
            //console.log(`parameters: ${JSON.stringify(parameters)}`);
            return parameters
        } else {
            let parameters = JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
            //console.log(`parameters: ${JSON.stringify(parameters)}`);
            return parameters;
        }

    } catch (error) {
        throw new Error(`Transformation failed: ${error.message}`);
    }
}

// Route to interact with OpenAI API
app.post('/api/execute-function', async (req, res) => {
    const { functionName, parameters } = req.body;

    // Import all functions
    const functions = await getFunctions();

    if (!functions[functionName]) {
        return res.status(404).json({ error: 'Function not found' });
    }

    try {
        // Call the function
        const result = await functions[functionName].execute(...Object.values(parameters));
        //console.log(`result: ${JSON.stringify(result)}`);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Function execution failed', details: err.message });
    }
});

// Example to interact with OpenAI API and get function descriptions
app.post('/api/openai-call', async (req, res) => {
    const { user_message } = req.body;

    const functions = await getFunctions();
    const availableFunctions = Object.values(functions).map(fn => fn.details);
    
    //console.log(`availableFunctions: ${JSON.stringify(availableFunctions)}`);
    
    let messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: user_message }
    ];

    //console.log(`messages: ${JSON.stringify(messages)}`);

    try {
        // Make OpenAI API call
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: availableFunctions
        });

        //console.log(`OpenAI Response: ${JSON.stringify(response)}`);

        if (response?.choices?.[0]?.message?.tool_calls === undefined) {
            res.json({message:response.choices[0].message.content + ' Kindly retry with new prompt.'});
            return;
        } 
       
       // Extract the arguments for get_delivery_date
// Note this code assumes we have already determined that the model generated a function call. See below for a more production ready example that shows how to check if the model generated a function call
        const toolCall = response.choices[0].message.tool_calls;

        //console.log(`toolCall: ${JSON.stringify(toolCall)}`);

// Extract the arguments for get_delivery_date
// Note this code assumes we have already determined that the model generated a function call. 
        if (toolCall && toolCall.length > 0) {

            const functionCallResults = [];
            let previousFunction;

            for (const TC of toolCall) {

                const functionName = TC.function.name;
                let parameters = JSON.parse(TC.function.arguments);

                //console.log(`FN: ${JSON.stringify(functionName)}`);
                //console.log(`P: ${JSON.stringify(parameters)}`);
                
                //Check to see if function depends on output of previous function through keys that have empty values
                if (typeof parameters === 'object' && !Array.isArray(parameters) && Object.values(parameters).some(value => value === "" || value === null || value === undefined) && functionCallResults.length > 0) {
                    //const previousResult = functionCallResults.length > 0 ? functionCallResults[functionCallResults.length - 1].result : null;

                    //console.log(`P: ${JSON.stringify(parameters)}`);

                    const previousResult = functionCallResults[functionCallResults.length - 1].result;

                    //console.log(`PR: ${JSON.stringify(previousResult)}`);

                    parameters = await transformOutput(availableFunctions, previousFunction, previousResult, functionName);

                    //If not enough info given for function to be called
                    if (typeof parameters === 'string' && parameters.endsWith('Kindly retry with new prompt.')) {
                        // Stop further execution if the response has been sent
                        res.json({message: parameters});
                        return;
                    }
                }

                previousFunction = TC.function;

                //console.log(`Function to call: ${functionName} with parameters: ${JSON.stringify(parameters)}`);

                const result = await functions[functionName].execute(...Object.values(parameters));

                //console.log(`result: ${JSON.stringify(result)}`);

// note that we need to respond with the function call result to the model quoting the tool_call_id
                functionCallResults.push({
                    tool_call_id: TC.id,
                    result: result
                });

                //console.log(`FCR: ${JSON.stringify(functionCallResults)}`);
            }

            // add to the end of the messages array to send the function call result back to the model
            messages.push(response.choices[0].message);
            for (const callResult of functionCallResults) {
                const function_call_result_message = {
                    role: "tool",
                    content: JSON.stringify({
                        result: callResult.result
                    }),
                    tool_call_id: callResult.tool_call_id
                };
                messages.push(function_call_result_message);
            }

            const completion_payload = {
                model: "gpt-4o",
                messages: messages,
            };

            // Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
            const final_response = await openai.chat.completions.create({
                model: completion_payload.model,
                messages: completion_payload.messages
            });

            //console.log(`messages2: ${JSON.stringify(messages)}`);

            // Extract the output from the final response
            let output = final_response.choices[0].message.content; 

            //console.log(`messages3: ${JSON.stringify(output)}`);

            res.json({ message:output, state: state });
        } else {
            res.json({ message: 'No function call detected.' });
        }

    } catch (error) {
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});

app.post('/api/prompt', async (req, res) => {
    // just update the state with the new prompt
    state = req.body;
    try {
        res.status(200).json({ message: `got prompt ${state.user_message}`, "state": state });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'User Message Failed', "state": state });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});