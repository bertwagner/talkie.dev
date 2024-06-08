class OpenAI {

    constructor (api_key = None) {
        this.api_key = api_key;

        this.tools = [{
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
        },
        {
            "type": "function",
            "function": {
                "name": "create_image",
                "description": "Create an image from text or another image using DALL-E.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "The prompt text use specifying what kind of image to generate",
                        }
                    },
                    "required": [],
                },
            }
        }];
    }

    async create_image(prompt) {
        const response = fetch(user_data['settings']['service_settings']['image_model_endpoint'], {
            method: 'POST',
            headers: {
            Authorization: `Bearer ${this.api_key}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: user_data["settings"]["service_settings"]["image_generation_model"],
                prompt: prompt,
                n: 1,
                response_format:"url",
                size: user_data["model"]["image_generation_size"],
                style: user_data["model"]["image_generation_style"]
            })
        });

        
        return response;
    }

    

    async call_api (messages) {
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
                tools: this.tools,
                messages: messages
            })
        })
        .then(response => response.body.pipeThrough(new TextDecoderStream()))
        .then(rs => {
            const reader = rs.getReader();
            if (!reader) return;

            return new ReadableStream({
                async start(controller) {
                    let dataDone = false;
                    let tool_call = {};
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        

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

                            // Enqueue the next data chunk into our target stream
                            if (next_value) {
                                controller.enqueue({
                                    "text": next_value
                                });
                            }
                        });


                        // When no more data needs to be consumed, break the reading
                        if (done) {
                            break;
                        }

                    
                    }

                    if ( Object.keys(tool_call).length > 0){
                        controller.enqueue({
                            "tool_call": tool_call
                        });
                    }
                    // Close the stream
                    controller.close();
                    reader.releaseLock();
                }
            })
        })
        // Create a new response out of the stream
        .then(rs => new Response(rs));

    }

}