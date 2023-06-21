import { Configuration, OpenAIApi } from "openai";
import { exec } from 'child_process';

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY // <-- YOUR KEY
}));

async function runCommand(cmd) {
  console.log("Running command:", cmd);
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(error.toString());
      }
      resolve(stdout);
    });
  });
}

async function runPythonCode(code) {
  console.log("Running Python code:", code);
  return new Promise((resolve, reject) => {
    exec(`python -c "${code}"`, (error, stdout, stderr) => {
      if (error) {
        resolve(error.toString());
      }
      resolve(stdout || "Executed Successfully");
    });
  });
}

async function chatWithAI() {
  let gptResponse = null;
  let history = [
    {
      role: "user",
      content: "run some python code that finds the current date and time. if it doesnt work stop."
    }
  ];

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
      } else if (functionCall && functionCall.name === "run_python_code") {
        const code = JSON.parse(functionCall.arguments).code;
        const output = await runPythonCode(code);
        history.push({
          role: "function",
          name: "run_python_code",
          content: output
        });
      } else if (functionCall && functionCall.name === "end") {
        console.log("Task completed.");
        break;
      }
    }

    try {
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
          },
          {
            name: "run_python_code",
            description: "Run Python code",
            parameters: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "The Python code to run. Must be just code, no additional formatting."
                },
              },
              required: ["code"]
            }
          },
          {
            name: "end",
            description: "Mark the task as complete and end the program.",
            parameters: {
              type: "object",
              properties: {}
            },
            required: []
          }
        ],
        function_call: history[history.length - 1].role == "function" ? "none" : "auto",
      });

      if (gptResponse.data.choices[0].message.content) {
        history.push({
          role: gptResponse.data.choices[0].message.role,
          content: gptResponse.data.choices[0].message.content
        });
        console.log(gptResponse.data.choices[0].message.content);
      }
    } catch (error) {
      console.log(error.message);
      throw new Error("error");
    }
  }
}

chatWithAI();