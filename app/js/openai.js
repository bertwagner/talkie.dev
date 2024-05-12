class OpenAI {

    constructor (api_key = None) {
        this.api_key = api_key;
    }

    //put this in another js file
    async call_api (messages) {
        let get_current_weather = function(location,format) {
            return "The weather is TOTALLY RAD!";
        }
        let tools = [
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
        ];
        
        // call api
        return fetch(user_data['settings']['service_settings']['endpoint'], {
            method: 'POST',
            headers: {
            Authorization: `Bearer ${this.api_key}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            model: user_data["settings"]["service_settings"]["llm_model"],
            response_format: ((user_data["model"]["json_mode"]) ? {"type":"json_object"} : null),
            stream: true,
            tools: tools,
            messages: messages
            })
        });

    }

}