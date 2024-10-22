[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/9wDnMTRl)
# FunctionAgents
Call Function from LLM

I added 3 functions (getCryptoPrice, getDadJoke & getTemp). I also edited server.js to allow it to run two functions in parallel, and sequentially. This is because OpenAI will return array of functions to call when GPT4 is called and it has detected more then 1 function is needed, so I simply modified to code to capture all these functions through looping through them. Running sequentially involved adding a transformation function (transformOutput) that does a seperate call to OpenAI API to transform output of first function to input required by second function. If it cannot do this, a message response from OpenAI will be generated as to why.

Call 2 functions that aren't sequential prompt: What is the temperature at 40.728388, -73.945754. Get me a dad joke.

Call 2 sequential functions prompt: Call 2 functions in your first response. First call getCrptoPrice to get the price of bitcoin. Then call scratchpad to record this price.

The prompt for sequential function calls has to be more precise to ensure second function is picked up as since the parameters for this function are only created once the first function has run, I had to modify the description logic for scratchpad (the second function I used in sequential calls) to ensure it can still be called without key and memory values existing yet.

Lastly, once final response is given to server is when that line of inquiry ends. I.e. a second prompt will not call on information from previous prompt, but will start a fresh function call.



OpenAI ChatGPT was used as an assistant to write up the final code.