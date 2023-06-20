import { Configuration, OpenAIApi } from "openai";
import { exec } from 'child_process';

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY // <-- YOUR KEY
}));

async function runCommand(cmd) {
  console.log("Running command:", cmd)
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(error.toString());
      }


      resolve(stdout);
    });
  });
}

async function chatWithAI() {
  let gptResponse = null;
  let history= [
    {
          role: "user",
          content: "Create a new folder called files and inside it, make a text file called README.md. that says 'made by AI'"
        }
    ]

  while (true) {
    if (gptResponse && gptResponse.data.choices && gptResponse.data.choices.length > 0) {
      const functionCall = gptResponse.data.choices[0].message.function_call;
      if (functionCall && functionCall.name === "run_cli_command") {
        const command = JSON.parse(functionCall.arguments).command;
        const output = await runCommand(command);
          history.push({
            role: "function",
            name: "run_cli_command",
            content: output ?? "Executed command successfully"
          });
      }
    }
try {
  console.log(history)
    gptResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages: history,
      functions: [
        {
          name: "run_cli_command",
          description: "Run a cli command",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "The command to run"
              },
            },
            required: ["command"]
          }
        }
      ],
      function_call: history[history.length - 1].role == "function" ? "none" : {name: "run_cli_command"} ,
    });
  if(gptResponse.data.choices[0].message.content) {
    history.push({
      role: gptResponse.data.choices[0].message.role,
      content: gptResponse.data.choices[0].message.content
    });
    console.log(gptResponse.data.choices[0].message.content);
  }
    
    // console.log( history[history.length - 1].role);
  
  } catch (error) {
    throw new Error("error");
}
  }
}

chatWithAI();
