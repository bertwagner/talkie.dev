//
// Variables
//

let api_key = "";
let model = "gpt-3.5-turbo";
let endpoint = "https://api.openai.com/v1/chat/completions";
let system_prompt = "You are a helpful assistant.";
document.querySelector("#system-prompt").value = system_prompt

if ("model" in localStorage){
    system_prompt = JSON.parse(localStorage.getItem("model"))["system_prompt"];
    document.querySelector("#system-prompt").value = system_prompt;
}
if ("settings" in localStorage){
    api_key = JSON.parse(localStorage.getItem("settings"))["api_key"];
    document.querySelector("#api-key").value = api_key;
}

const responseContainer = document.getElementById('chat-messages');




//
// Methods
//

let printPrompt = function(prompt) {
    const messageSent = document.createElement("article");
    messageSent.classList.add('message');
    messageSent.classList.add('message-sent');
    messageSent.textContent = prompt;
    responseContainer.appendChild(messageSent);
}



let callApi = async function(system_prompt, prompt, model) {

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${api_key}`,
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
            ],
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
    }
    
});

document.addEventListener('submit', function(event) {
        event.preventDefault();

        if (event.target.id == "model") {

            data = {
                system_prompt: document.querySelector("#system-prompt").value
            }

            localStorage.setItem("model", JSON.stringify(data));
            system_prompt = localStorage.getItem("model")["system_prompt"];
            document.querySelector("#service").blur();
        }

        if (event.target.id == "settings") {

            data = {
                service: document.querySelector("#service").value,
                model: document.querySelector("#model").value,
                api_key: document.querySelector("#api-key").value
            }


            localStorage.setItem("settings", JSON.stringify(data));
            document.querySelector("#service").blur();
        }

        if (event.target.id == "send-prompt") {
            prompt = document.querySelector("#user-prompt").value;
            document.querySelector("#user-prompt").value="";
            document.querySelector("#user-prompt").blur();
            printPrompt(prompt);
            callApi(system_prompt, prompt, model);
        }
});


///
/// init
/// 

prompt = "Draw me an ascii christmas tree"
printPrompt(prompt);
callApi(system_prompt, prompt, model)
