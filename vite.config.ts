import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// En desarrollo, `npm run dev` también ejecuta las Netlify Functions de netlify/functions/,
// así el front y el back se levantan juntos con un solo comando.
// En producción no se usa: Netlify ejecuta las funciones por su cuenta.
function netlifyFunctionsDev(): Plugin {
  return {
    name: 'netlify-functions-dev',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions', async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const name = url.pathname.replace(/^\/+/, '').split('/')[0];
        const sendError = (status: number, message: string) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        };
        if (!/^[\w-]+$/.test(name)) return sendError(404, 'Función inexistente.');
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const file = pathToFileURL(path.resolve('netlify/functions', `${name}.mjs`)).href;
          const mod = await import(`${file}?t=${Date.now()}`);
          const result = await mod.handler({
            httpMethod: req.method,
            headers: req.headers,
            body: chunks.length ? Buffer.concat(chunks).toString('utf8') : null,
            queryStringParameters: Object.fromEntries(url.searchParams),
          });
          res.statusCode = result.statusCode;
          for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, String(value));
          res.end(result.body || '');
        } catch (error) {
          console.error(`[función ${name}]`, error);
          sendError(500, `Error en la función local ${name}.`);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Carga todas las variables del .env (también las que no empiezan con VITE_) para que las funciones las lean.
  // Las que no empiezan con VITE_ nunca llegan al navegador.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), netlifyFunctionsDev()] };
});
