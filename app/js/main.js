//
// Variables
//

// defaults
let user_data = {
   model: {
    system_prompt: "You are a helpful assistant.",
    json_mode: false
   },
   settings: {
    service: "OpenAI",
    service_settings: {
        llm_model: "gpt-3.5-turbo",
        endpoint: "https://api.openai.com/v1/chat/completions",
        api_key: "",
        image_generation_on: true,
        image_generation_model: "dall-e",
        vision_generation_on: true,
        vision_generation_model: "gpt-4-turbo"
    }
    
   }
};

let messages = [];


//
// Methods
//

function iterate(obj, stack=null) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                if (stack == null) {
                    iterate(obj[property], property);
                } else {
                    iterate(obj[property], stack + '__' + property);
                }
            } else {
                if (document.querySelector(`#${stack}__${property}`) != null) {
                    let element = document.querySelector(`#${stack}__${property}`);
                    if (element.type == "checkbox")
                        element.checked = obj[property];
                    else {
                        element.value = obj[property];
                    }
                }
            }
        }
    }
}


let send_prompt = async function(user_prompt) {

    let get_current_weather = function(location,format) {
        return "The weather is TOTALLY RAD!";
    }
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_current_weather",
                "description": "Get current weather",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g. San Francisco, CA",
                        },
                        "format": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"],
                            "description": "The temperature unit to use. Infer this from the users location.",
                        },
                    },
                    "required": [],
                },
            }
        }
    ]


    messages.push({
        "role": "user",
        "content": user_prompt
    });

    // print user prompt to chat
    const messageSent = document.createElement("article");
    messageSent.classList.add('message');
    messageSent.classList.add('message-sent');
    let p = document.createElement("p");
    p.textContent = user_prompt;
    messageSent.append(p);

    responseContainer.appendChild(messageSent);

    // add json phrase if not found

    if (user_data["model"]["json_mode"] == true && messages[messages.length-1]["content"].toLowerCase().indexOf("json") == -1) {
        messages[messages.length-1]["content"] += "Please return in JSON format.";
    }

    // call api
    const response = await fetch(user_data['settings']['service_settings']['endpoint'], {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${user_data['settings']['service_settings']['api_key']}`,
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: user_data["settings"]["service_settings"]["llm_model"],
        response_format: ((user_data["model"]["json_mode"]) ? {"type":"json_object"} : null),
        stream: true,
        tools: tools,
        messages: messages
        }),
    });

    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) return;

    const messageReceived = document.createElement("article");
    messageReceived.classList.add('message');
    messageReceived.classList.add('message-received');
    responseContainer.appendChild(messageReceived);

    var converter = new showdown.Converter();
    let raw_output = '';

    if (user_data["model"]["json_mode"]==true){
        raw_output += '```js\n'
    }

    let tool_call = {};
    
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        let dataDone = false;
        const arr = value.split('\n');
        arr.forEach((data) => {
            if (data.length === 0) { 
                // ignore empty message
                return; 
            } 
            if (data.startsWith(':')) { 
                // ignore sse comment message
                console.log('sse!')
                return; 
            } 
            if (data === 'data: [DONE]') {
                dataDone = true;
                return;
            }

            const json = JSON.parse(data.substring(6));
            let next_value = json.choices[0].delta.content;
            

            if (next_value) {
                raw_output += next_value
                messageReceived.innerHTML = converter.makeHtml(raw_output);
                messageReceived.scrollIntoView();
            } 

            if (json.choices[0].delta.tool_calls) {
                let tool_output = json.choices[0].delta.tool_calls[0];
                if (tool_output.id){
                    tool_call["id"] = tool_output.id;
                }
                
                if (tool_output["function"].name){
                    tool_call["name"] = tool_output["function"].name;
                }

                if (!tool_call["arguments"]) {
                    tool_call["arguments"] = "";
                }

                if (tool_output["function"].arguments){
                    tool_call["arguments"] += tool_output["function"].arguments;
                }
            }
        });
        
        if (dataDone) break;
        
    }
    
    if (user_data["model"]["json_mode"]==true){
        raw_output += '\n```'
    }


    messageReceived.innerHTML = converter.makeHtml(raw_output);
    messageReceived.scrollIntoView();
    messages.push({
        "role": "assistant",
        "content": raw_output
    });



    if (tool_call["name"] == "get_current_weather") {
        tool_call["arguments"] = JSON.parse(tool_call["arguments"]);

        let weather = get_current_weather(tool_call["arguments"]["location"], tool_call["arguments"]["format"])

        raw_output += weather;
        messageReceived.innerHTML = converter.makeHtml(raw_output);
        messageReceived.scrollIntoView();
        messages.push({
            "role": "function",
            "tool_call_id": tool_call["id"],
            "name": "get_current_weather",
            "content": weather
        });

    }
}


// 
// Event listeners
//

document.addEventListener('click', function (event) {
    if (event.target.dataset.nav == "about") {
        document.querySelector("#about-container").classList.toggle("hidden");
        document.querySelector("#model-container").classList.add("hidden");
        document.querySelector("#settings-container").classList.add("hidden");
    }
    if (event.target.dataset.nav == "model") {
        document.querySelector("#about-container").classList.add("hidden");
        document.querySelector("#model-container").classList.toggle("hidden");
        document.querySelector("#settings-container").classList.add("hidden");
    }

    if (event.target.dataset.nav == "settings") {
        document.querySelector("#about-container").classList.add("hidden");
        document.querySelector("#model-container").classList.add("hidden");
        document.querySelector("#settings-container").classList.toggle("hidden");
    }

    if (event.target.id == "clear") {
        document.querySelector("#chat-messages").innerHTML="";
        
        // clear messages and add system prompt
        messages = [];
        messages.push({
            "role": "system",
            "content": user_data["model"]["system_prompt"]
        })
    }
    
});

document.addEventListener('submit', function(event) {
        event.preventDefault();

        if (event.target.id == "model") {
            user_data['model']['system_prompt'] = document.querySelector("#model__system_prompt").value;
            user_data['model']['json_mode'] = document.querySelector("#model__json_mode").checked;

            localStorage.setItem("user_data", JSON.stringify(user_data));
            document.querySelector("#model-container").classList.toggle("hidden");
        }

        if (event.target.id == "settings") {

            user_data['settings']['service'] = document.querySelector("#settings__service").value;
            user_data['settings']['service_settings']['llm_model'] = document.querySelector("#settings__service_settings__llm_model").value;
            user_data['settings']['service_settings']['api_key'] = document.querySelector("#settings__service_settings__api_key").value;
            
            localStorage.setItem("user_data", JSON.stringify(user_data));
            document.querySelector("#settings-container").classList.toggle("hidden");
        }

        if (event.target.id == "send-prompt") {
            user_prompt = document.querySelector("#user-prompt").value;
            document.querySelector("#user-prompt").value="";
            document.querySelector("#user-prompt").blur();

            send_prompt(user_prompt);

            document.querySelector("#user-prompt").focus();
        }
});


///
/// init
/// 

// load user settings from localStorage
if ("user_data" in localStorage) {
    user_data = JSON.parse(localStorage.getItem("user_data"));

    iterate(user_data);

    // add system prompt to messages
    messages.push({
        "role": "system",
        "content": user_data["model"]["system_prompt"]
    })
}



const responseContainer = document.getElementById('chat-messages');

let user_prompt = "What's the weather in rocky river, oh?"
send_prompt(user_prompt)
