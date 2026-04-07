import http from 'http';
import { logger } from '../../utils/logger';
import { ipcContext } from '../context';

export class AuthServer {
  private static server: http.Server | null = null;
  private static PORT = 8888;

  static start() {
    if (this.server) {
      logger.warn('AuthServer: Server already running');
      return;
    }

    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${this.PORT}`);

      if (url.pathname === '/oauth-callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (code) {
          logger.info(`AuthServer: Received authorization code: ${code.substring(0, 10)}...`);

          // Send code to renderer
          if (ipcContext.mainWindow) {
            logger.info('AuthServer: Sending code to renderer via IPC');
            ipcContext.mainWindow.webContents.send('GOOGLE_AUTH_CODE', code);
            logger.info('AuthServer: Code sent successfully');
          } else {
            logger.error('AuthServer: Main window not found, cannot send code');
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Login Successful</h1>
                <p>You can close this window and return to Antigravity Helper.</p>
                <script>
                  setTimeout(() => window.close(), 3000);
                </script>
              </body>
            </html>
          `);
        } else if (error) {
          logger.error(`AuthServer: OAuth error: ${error}`);
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body>
                <h1>Login Failed</h1>
                <p>Error: ${error}</p>
              </body>
            </html>
          `);
        } else {
          res.writeHead(400);
          res.end('Missing code parameter');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.on('error', (err) => {
      logger.error('AuthServer: Server error', err);
    });

    this.server.listen(this.PORT, () => {
      logger.info(`AuthServer: Listening on http://localhost:${this.PORT}`);
    });
  }

  static stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      logger.info('AuthServer: Stopped');
    }
  }
}
