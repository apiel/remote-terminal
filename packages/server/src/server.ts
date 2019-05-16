#!/usr/bin/env node

import { info, error, success } from 'logol';
import { spawn } from 'node-pty';
import * as express from 'express';
import * as expressWs from 'express-ws';
import { Response, Request } from 'express-serve-static-core';
// import * as bodyParser from 'body-parser';

const port = 3005;
const USE_BINARY_UTF8 = false;

const terminals = {};
const logs = {};

async function start() {
    info('Starting server.');
    const app = express();
    expressWs(app);

    // app.use(bodyParser.json());

    // if (staticFolder) {
    //     info('Add static folder', staticFolder);
    //     app.use(express.static(staticFolder));
    //     app.get('*', (req, res) =>
    //         res.sendFile(join(staticFolder, 'index.html'), {
    //             root: process.cwd(),
    //         }),
    //     );
    // }

    app.all('/terminals', (req: Request, res: Response) => {
        // if (Object.keys(terminals).length) {
        //   res.send(Object.keys(terminals)[0].toString());
        //   res.end();
        //   return;
        // }
        const cols = parseInt(req.query.cols, 10);
        const rows = parseInt(req.query.rows, 10);

        const term = spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
                name: 'xterm-color',
                cols: cols || 80,
                rows: rows || 24,
                cwd: process.env.PWD,
                env: process.env,
                encoding: USE_BINARY_UTF8 ? null : 'utf8'
            });

        info('Created terminal with PID: ', term.pid);
        terminals[term.pid] = term;
        logs[term.pid] = '';
        term.on('data', (data) => {
            logs[term.pid] += data;
        });
        res.send(term.pid.toString());
        res.end();
    });

    // app.post('/terminals/:pid/size', (req, res) => {
    //     const pid = parseInt(req.params.pid, 10);
    //         cols = parseInt(req.query.cols),
    //         rows = parseInt(req.query.rows),
    //         term = terminals[pid];

    //     term.resize(cols, rows);
    //     console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
    //     res.end();
    // });

    (app as any).ws('/terminals/:pid', (ws: any, req: any) => {
        const term = terminals[parseInt(req.params.pid, 10)];
        info('Connected to terminal ', term.pid);
        ws.send(logs[term.pid]);

        // string message buffering
        function buffer(socket, timeout) {
            let s = '';
            let sender = null;
            return (data) => {
                s += data;
                if (!sender) {
                    sender = setTimeout(() => {
                        socket.send(s);
                        s = '';
                        sender = null;
                    }, timeout);
                }
            };
        }
        // binary message buffering
        function bufferUtf8(socket, timeout) {
            let buf = [];
            let sender = null;
            let length = 0;
            return (data) => {
                buf.push(data);
                length += data.length;
                if (!sender) {
                    sender = setTimeout(() => {
                        socket.send(Buffer.concat(buf, length));
                        buf = [];
                        sender = null;
                        length = 0;
                    }, timeout);
                }
            };
        }
        const send = USE_BINARY_UTF8 ? bufferUtf8(ws, 5) : buffer(ws, 5);

        term.on('data', (data) => {
            try {
                send(data);
            } catch (ex) {
                // The WebSocket is not open, ignore
            }
        });
        ws.on('message', (msg) => {
            term.write(msg);
        });
        ws.on('close', () => {
            term.kill();
            info('Closed terminal ', term.pid);
            // Clean things up
            delete terminals[term.pid];
            delete logs[term.pid];
        });
    });

    app.use((
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        error(err);
        res.status(500).send(err.message);
    });

    app.listen(port, () => {
        success(`Server listening on port ${port}!`);
    });
}

start();
