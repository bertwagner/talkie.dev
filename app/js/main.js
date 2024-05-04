//
// Variables
//

// defaults
let user_data = {
   model: {
    system_prompt: "You are a helpful assistant."
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
                    document.querySelector(`#${stack}__${property}`).value = obj[property];
                }
            }
        }
    }
}


let send_prompt = async function(user_prompt) {

    messages.push({
        "role": "user",
        "content": user_prompt
    });

    // print user prompt to chat
    const messageSent = document.createElement("article");
    messageSent.classList.add('message');
    messageSent.classList.add('message-sent');
    messageSent.textContent = user_prompt;
    responseContainer.appendChild(messageSent);

    // call api
    const response = await fetch(user_data['settings']['service_settings']['endpoint'], {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${user_data['settings']['service_settings']['api_key']}`,
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: user_data["settings"]["service_settings"]["llm_model"],
        stream: true,
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
            } 
        });
        
        if (dataDone) break;
    }

    messageReceived.innerHTML = converter.makeHtml(raw_output);
    messages.push({
        "role": "assistant",
        "content": raw_output
    });
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
        }
});


///
/// init
/// 

// load user settings from localStorage
if ("user_data" in localStorage) {
    user_data = JSON.parse(localStorage.getItem("user_data"));
    console.log(user_data)
    iterate(user_data);

    // add system prompt to messages
    messages.push({
        "role": "system",
        "content": user_data["model"]["system_prompt"]
    })
}



const responseContainer = document.getElementById('chat-messages');

let user_prompt = "Draw me an ascii christmas tree"

send_prompt(user_prompt)
