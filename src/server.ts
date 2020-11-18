import * as express from 'express';
import * as expressWs from 'express-ws';
import * as path from 'path';
import {spawn, IPty} from 'node-pty';

const app = expressWs(express()).app;

const port = 3000;

let terminal: IPty | undefined;
let logs: string;

app.use( '/xterm.css', express.static(__dirname + '/../node_modules/xterm/css/xterm.css'));
app.use('/bundle.js', express.static(__dirname + '/../dist/bundle.js'));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../public/index.html'));
});

app.post('/terminal', (req, res) => {
  if (terminal === undefined) {
    const cols = parseInt(req.query.cols as string) || 80;
    const rows = parseInt(req.query.rows as string) || 24;
    const env = removeUndefined(process.env);

    console.log('Creating terminal');
    terminal = spawn('bash', [], {
      name: 'xterm-color',
      cols: cols,
      rows: rows,
      cwd: env.HOME,
      env: env,
    });

    logs = '';
    terminal.on('data', data => {
      logs += data;
    });

    terminal.on('exit', (exitCode, signal) => {
      exitTerminal(exitCode, signal);
    });

    res.status(201).send(terminal.pid.toString());
  } else {
    res.sendStatus(204);
  }
});

app.post('/terminal/resize', (req, res) => {
  if (terminal === undefined) {
    res.status(400).send('Terminal not created yet');
    return;
  }

  const cols = parseInt(req.query.cols as string);
  const rows = parseInt(req.query.rows as string);
  console.log('Resizing terminal to ' + cols + 'x' + rows);
  terminal.resize(cols, rows);
  console.log('Terminal resized to ' + cols + 'x' + rows);
  res.sendStatus(200);
});

app.ws('/terminal', (ws, res) => {
  if (terminal === undefined) {
    return;
  }

  console.log('Connected to terminal');
  ws.send(logs);

  terminal.on('data', data => {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });

  ws.on('message', message => {
    terminal!.write(message.toString());
  });

  ws.on('close', () => {
    exitTerminal(0);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

type PtyEnv = {[key: string]: string};

function removeUndefined(env: NodeJS.ProcessEnv): PtyEnv {
  const result: PtyEnv = {};

  Object.entries(env)
    .filter(([k, v]) => v !== undefined)
    .forEach(([k, v]) => {
      result[k] = v!;
    });

  return result;
}

function exitTerminal(exitCode: number, signal?: number): void {
  if (terminal) {
    terminal!.kill();
    terminal = undefined;
    console.log(`Terminal closed: exitCode=${exitCode}, signal=${signal}`);
    logs = '';
  }
}
