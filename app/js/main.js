//
// Variables
//

// defaults
let user_data = {
    model: {
        system_prompt: "You are a helpful assistant.",
        json_mode: false,
        image_generation_size: "1024x1024",
        image_generation_style: "natural"
    },
    settings: {
        service: "OpenAI",
        service_settings: {
            llm_model: "gpt-3.5-turbo",
            endpoint: "https://api.openai.com/v1/chat/completions",
            api_key: "",
            image_generation_on: true,
            image_generation_model: "dall-e-3",
            image_model_endpoint: "https://api.openai.com/v1/images/generations",
            vision_generation_on: true,
            vision_generation_model: "gpt-4-turbo"
        }

    }
};

let messages = [];


//
// Methods
//

function iterate(obj, stack = null) {
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


let print_prompt = function (prompt_class, prompt) {
    const message = document.createElement("article");
    message.classList.add('message');
    message.classList.add(prompt_class);

    if (prompt_class == "message-sent") {
        let p = document.createElement("p");
        p.textContent = prompt;
        message.append(p);
    }

    responseContainer.appendChild(message);

    return message;
}

let auto_expand_textarea = function (field) {
    // Get the computed styles for the element
    var computed = window.getComputedStyle(field);

    // Calculate the height
    var height = parseInt(computed.getPropertyValue('border-top-width'), 10)
        + parseInt(computed.getPropertyValue('padding-top'), 10)
        + field.scrollHeight -
        + parseInt(computed.getPropertyValue('padding-bottom'), 10)
        + parseInt(computed.getPropertyValue('border-bottom-width'), 10);

    field.style.height = height + 'px';
};

let call_tools = async function (next_value) {

}


let send_prompt = async function (user_prompt) {

    messages.push({
        "role": "user",
        "content": user_prompt
    });

    print_prompt("message-sent", user_prompt);

    // add json phrase if not found
    if (user_data["model"]["json_mode"] == true && messages[messages.length - 1]["content"].toLowerCase().indexOf("json") == -1) {
        messages[messages.length - 1]["content"] += "Please return in JSON format.";
    }

    const messageReceived = print_prompt("message-received", "");

    var converter = new showdown.Converter();
    let raw_output = '';

    if (user_data["model"]["json_mode"] == true) {
        raw_output += '```js\n'
    }

    const response = await openai.call_api(messages);

    const reader = response.body?.getReader();

    if (!reader) return;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        let dataDone = false;

        let next_value = value;

        if ("text" in next_value) {
            raw_output += next_value["text"]
            messageReceived.innerHTML = converter.makeHtml(raw_output);
            messageReceived.scrollIntoView();
        }

        if ("tool_call" in next_value) {
            if (next_value["tool_call"]["name"] == "create_image") {
                let args = JSON.parse(next_value["tool_call"]["arguments"]);
                messageReceived.innerHTML = "<p>Generating image...</p><progress style='max-width:500px' />";
                let image = await openai.create_image(args["prompt"])
                image = await image.json();

                image_url = image["data"][0]["url"];


                let image_html = `<img src="${image_url}" />`;

                raw_output += image_html;
                messageReceived.innerHTML = image_html
                messageReceived.scrollIntoView();
                messages.push({
                    "role": "function",
                    "tool_call_id": next_value["tool_call"]["id"],
                    "name": next_value["tool_call"]["name"],
                    "content": image_html
                });
            }
        }

        if (dataDone) break;

    }

    if (user_data["model"]["json_mode"] == true) {
        raw_output += '\n```'
    }


    messageReceived.innerHTML = converter.makeHtml(raw_output);
    messageReceived.scrollIntoView();
    messages.push({
        "role": "assistant",
        "content": raw_output
    });



}




// 
// Event listeners
//


document.addEventListener('input', function (event) {
    if (event.target.tagName.toLowerCase() !== 'textarea') return;
    auto_expand_textarea(event.target);
}, false);


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
        document.querySelector("#chat-messages").innerHTML = "";

        // clear messages and add system prompt
        messages = [];
        messages.push({
            "role": "system",
            "content": user_data["model"]["system_prompt"]
        })
    }

});

document.addEventListener('submit', function (event) {
    event.preventDefault();

    if (event.target.id == "model") {
        user_data['model']['system_prompt'] = document.querySelector("#model__system_prompt").value;
        user_data['model']['json_mode'] = document.querySelector("#model__json_mode").checked;
        user_data['model']['image_generation_size'] = document.querySelector("#model__image_generation_size").value;
        user_data['model']['image_generation_style'] = document.querySelector("#model__image_generation_style").value;

        localStorage.setItem("user_data", JSON.stringify(user_data));
        document.querySelector("#model-container").classList.toggle("hidden");
    }

    if (event.target.id == "settings") {

        // user_data['settings']['service'] = document.querySelector("#settings__service").value;
        user_data['settings']['service_settings']['llm_model'] = document.querySelector("#settings__service_settings__llm_model").value;
        user_data['settings']['service_settings']['api_key'] = document.querySelector("#settings__service_settings__api_key").value;
        user_data['settings']['service_settings']['image_generation_model'] = document.querySelector("#settings__service_settings__image_generation_model").value;

        openai.api_key = user_data['settings']['service_settings']['api_key']

        localStorage.setItem("user_data", JSON.stringify(user_data));
        document.querySelector("#settings-container").classList.toggle("hidden");
    }

    if (event.target.id == "send-prompt") {
        user_prompt = document.querySelector("#user-prompt").value;
        document.querySelector("#user-prompt").value = "";
        document.querySelector("#user-prompt").blur();

        send_prompt(user_prompt);

        // document.querySelector("#user-prompt").focus();
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
let openai = new OpenAI(user_data['settings']['service_settings']['api_key']);


const responseContainer = document.getElementById('chat-messages');

//let user_prompt = "Generate an image of a zebra climbing a tree"
//let user_prompt = "How are you feeling?"
//send_prompt(user_prompt)

