import { appendFile } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
//import WordTokenizer from "natural.WordTokenizer";
const execute = async (action, key, memory) => {
    
    const filePath = join(process.cwd(), './functions/memories.csv');
    
        // Prepare the text as a CSV entry (with escaping of quotes)
        //const csvEntry = `"${memory.replace(/"/g, '""')}"\n`;

    try {
        if (action === 'set') {
            await appendFile(filePath, `${key}, ${memory}\n`);
            console.log('Memory stored!'+ memory);
            return { [key]: memory };
        } else if (action == 'get') {
            const data = await fs.promises.readFile(filePath, 'utf8');
            const lines = data.split('\n');
            for (const line of lines) {
                const [storedKey, storedMemory] = line.split(',');
                if (storedKey == key) {
                    return { key: storedMemory };
                }
            }
            return { [key]: null };
        } else if (action == 'getall') {
            const data = await fs
                .promises.readFile(filePath, 'utf8')
                .catch(() => '');
            const memories = data   
                .split('\n')
                .map((line) => {
                    const   [storedKey, storedMemory] = line.split(',');
                    return { [storedKey]: storedMemory };
                });
    
            return memories;
        }
    } catch (err) {
        console.error('Error writing to the file:', err);
    }
     return `Memory Not stored! ${memory}`;
}
    
const details = {
    "type": "function",
    function:{
    "name": "scratchpad",
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "description": "action is one of set, get, getall or delete"
            },
            "key": {
                "type": "string",
                "description": "The key to the entity. When scratchpad set to get result of another function, leave this value empty and the key will be retrieved by another function later."
            },
            "memory": {
                "type": "string",
                "description": "The text to store. When scratchpad set to get result of another function, leave this value empty and the memory will be retrieved by another function later."
            }
        },
        "required": ["action","key","memory"]
    },
},
    "description": "Given an entity action, key and memory, this function will store, get, list or delete the memory. For set action, key and memory should be empty if this function stores a result that hasn't been retrieved yet."
};
export { execute, details };