// Netlify Function to proxy UniAPI requests
// This avoids CORS issues by calling the API from the server instead of the browser

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const { messages, system } = JSON.parse(event.body);

    // Prepare messages in OpenAI format (required by UniAPI)
    const formattedMessages = [
      {
        role: 'system',
        content: system
      },
      ...messages
    ];

    console.log('Calling UniAPI...');

    // Call UniAPI endpoint (OpenAI-compatible)
    const response = await fetch('https://api.uniapi.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UNIAPI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',  // Using GPT model format for UniAPI
        messages: formattedMessages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    console.log('UniAPI Response Status:', response.status);
    console.log('UniAPI Response:', JSON.stringify(data).substring(0, 500));

    // Check for errors
    if (!response.ok || data.error) {
      console.error('API Error:', data);
      return {
        statusCode: response.status || 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'API Error',
          details: data
        })
      };
    }

    // UniAPI returns OpenAI format: { choices: [{ message: { content: "..." } }] }
    // Convert to Anthropic format for our chatbot
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const convertedResponse = {
        content: [
          {
            type: 'text',
            text: data.choices[0].message.content
          }
        ],
        role: 'assistant'
      };

      console.log('Successfully converted response');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(convertedResponse)
      };
    } else {
      console.error('Unexpected response format:', data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Unexpected response format',
          details: data
        })
      };
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      })
    };
  }
};
