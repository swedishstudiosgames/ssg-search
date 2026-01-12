/**
 * Cloudflare Pages Function
 * Endpoint: /upload
 * Logic: Receives image -> Adds hidden API Key -> Sends to ImgBB -> Returns link
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Prepare ImgBB Upload
    const imgbbData = new FormData();
    imgbbData.append('image', image);
    
    // Auto-expire in 5 minutes (300 seconds)
    const expiration = 300; 
    
    // Retrieve the Secret Key you saved in Cloudflare Dashboard
    const apiKey = env.IMGBB_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Misconfiguration: Missing API Key" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Send to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}&expiration=${expiration}`, {
      method: 'POST',
      body: imgbbData
    });

    const result = await response.json();

    // 3. Return result to frontend
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
