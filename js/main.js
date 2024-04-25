//
// Variables
//


const endpoint = 'https://api.openai.com/v1/chat/completions';
const model = 'gpt-3.5-turbo';

let apiKey = localStorage.getItem(document.querySelector("#service").value);
document.querySelector("#apikey").value = apiKey;

let systemPrompt = localStorage.getItem("system-prompt")
document.querySelector("#system-prompt").value = systemPrompt;

const responseContainer = document.getElementById('chat-messages');


//
// Methods
//

let printPrompt = function(prompt) {
    const messageSent = document.createElement("div");
    messageSent.classList.add('message-sent');
    messageSent.textContent = prompt;
    responseContainer.appendChild(messageSent);
}


let callApi = async function(systemPrompt, prompt,model) {

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
            {
                "role": "system",
                "content": systemPrompt
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

    const messageReceived = document.createElement("div");
    messageReceived.classList.add('message-received');
    responseContainer.appendChild(messageReceived);
    
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
                return; 
            } 
            if (data === 'data: [DONE]') {
                dataDone = true;
                return;
            }
            
            const json = JSON.parse(data.substring(6));
            if (json.choices[0].delta.content) {
                messageReceived.innerHTML += `${json.choices[0].delta.content.replace("\n","<br>")}`;
            }
        });
        if (dataDone) break;
    }
}

// 
// Event listeners
//
document.addEventListener('click', function (event) {

});

document.addEventListener('submit', function(event) {
        event.preventDefault();

        if (event.target.id == "settings") {
            localStorage.setItem(document.querySelector("#service").value, document.querySelector("#apikey").value);
            localStorage.setItem("system-prompt", document.querySelector("#system-prompt").value);
            systemPrompt = localStorage.getItem("system-prompt")
        }

        if (event.target.id == "send-prompt") {
            prompt = document.querySelector("#user-prompt").value;
            document.querySelector("#user-prompt").value="";
            printPrompt(prompt);
            callApi(systemPrompt, prompt, model);
        }
});


///
/// init
/// 
