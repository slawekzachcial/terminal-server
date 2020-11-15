import {Terminal} from 'xterm';
import {AttachAddon} from 'xterm-addon-attach';
import {FitAddon} from 'xterm-addon-fit';

const terminalContainer = document.getElementById('terminal-container');
const protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
const socketURL = protocol + location.hostname + (location.port ? (':' + location.port) : '') + '/terminal';

let fitAddon: FitAddon;
let attachAddon: AttachAddon;
let socket: WebSocket;
let terminal: Terminal;
let pid: string;

function createTerminal(): void {
  terminal = new Terminal({
    windowsMode: navigator.platform === 'Windows',
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  terminal.onResize((size: {cols: number, rows: number}) => {
    if (!pid) {
      return;
    }
    fetch('/terminal/resize?cols=' + size.cols + '&rows=' + size.rows, {method: 'POST'});
  });

  terminal.open(terminalContainer!);
  fitAddon.fit();
  terminal.focus();

  setTimeout(() => {
    // updateTerminalSize();

    fetch('/terminal', {method: 'POST'}).then(res => {
      res.text().then(processId => {
        pid = processId;
        socket = new WebSocket(socketURL);
        socket.onopen = () => {
          attachAddon = new AttachAddon(socket);
          terminal.loadAddon(attachAddon);
        };
      });
    });
  }, 0);
}

// function updateTerminalSize(): void {
//   // TODO: how to deal with cols and rows?
//   const cols = 80;
//   const rows = 24;
//   const width = (cols * terminal._core._renderService.dimensions.actualCellWidth + terminal._core.viewport.scrollBarWidth).toString() + 'px';
//   const height = (rows * terminal._core._renderService.dimensions.actualCellHeight).toString() + 'px';
//   terminalContainer!.style.width = width;
//   terminalContainer!.style.height = height;
//   fitAddon.fit();
// }

createTerminal();
