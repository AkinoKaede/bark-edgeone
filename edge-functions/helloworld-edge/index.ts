export async function onRequestGet({ request, params, env }: any): Promise<Response> {
  const json = JSON.stringify({
    "code": 0,
    "message": "Hello World"
  });

  // // @ts-ignore KV binding injected by EdgeOne Pages
  // await KV_STORAGE.put('test_key', 'test_value');
  return new Response(json, {
    headers: {
      'content-type': 'application/json',
      'x-edgefunctions': 'Welcome to use EdgeOne Pages Functions.',
    },
  });
}

