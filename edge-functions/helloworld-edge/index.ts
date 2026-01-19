export function onRequest(context: any): Response {
  const json = JSON.stringify({
    "code": 0,
    "message": "Hello World"
  });
  return new Response(json, {
    headers: {
      'content-type': 'application/json',
      'x-edgefunctions': 'Welcome to use EdgeOne Pages Functions.',
    },
  });
}

