// These files contain losslessly compressed, authored data; shader programs still
// belong to each WebGL context and are prepared separately by the renderer.
export async function loadBakedBuffer(url:string,expectedBytes:number):Promise<ArrayBuffer>{
 const response=await fetch(url);
 if(!response.ok)throw new Error(`Asset request failed (${response.status}): ${url}`);
 if(!response.body)throw new Error(`Asset response was empty: ${url}`);
 const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 if(buffer.byteLength!==expectedBytes)throw new Error(`Asset data size mismatch: ${url}`);
 return buffer;
}
