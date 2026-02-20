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

    // Call UniAPI (which supports Claude and other models)
    const response = await fetch('https://api.uniapi.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UNIAPI_API_KEY}` // API key stored securely in environment variables
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // UniAPI supports Claude models
        messages: [
          {
            role: 'system',
            content: system
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    console.log('UniAPI Response:', JSON.stringify(data));

    // UniAPI uses OpenAI-compatible format
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
      // Return error if response format is unexpected
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
