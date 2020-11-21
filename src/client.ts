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
    fetch(`/terminal/resize?cols=${size.cols}&rows=${size.rows}`, {method: 'POST'});
  });

  // https://alvarotrigo.com/blog/firing-resize-event-only-once-when-resizing-is-finished/
  let resizeId: number;
  window.onresize = () => {
    if (!pid) {
      return;
    }

    window.clearTimeout(resizeId);
    resizeId = window.setTimeout(() => {
      const [cols, rows] = maximizeTerminalContainer();
      fetch(`/terminal/resize?cols=${cols}&rows=${rows}`, {method: 'POST'});
    }, 500);
  };

  terminal.open(terminalContainer!);
  fitAddon.fit();
  terminal.focus();

  setTimeout(() => {
    // const [cols, rows] = getTerminalColsAndRows();
    const [cols, rows] = maximizeTerminalContainer();

    fetch(`/terminal?cols=${cols}&rows=${rows}`, {method: 'POST'}).then(res => {
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

function maximizeTerminalContainer(): [number, number] {
  // https://www.w3schools.com/cssref/css_default_values.asp
  const defaultBrowserMargin = 8;
  // TODO: DANGER - using private terminal API :-(
  const terminalCore = (terminal as any)._core;

  const maxWidth = window.innerWidth - 2 * defaultBrowserMargin;
  const maxHeight = window.innerHeight - 2 * defaultBrowserMargin;

  const cols = Math.floor(
    (maxWidth - terminalCore.viewport.scrollBarWidth)
    / terminalCore._renderService.dimensions.actualCellWidth);
  const rows = Math.floor(
    maxHeight / terminalCore._renderService.dimensions.actualCellHeight);

  const containerWidth =
    cols * terminalCore._renderService.dimensions.actualCellWidth
    + terminalCore.viewport.scrollBarWidth;
  const containerHeight =
    rows * terminalCore._renderService.dimensions.actualCellHeight;

  terminalContainer!.style.height = containerHeight + 'px';
  terminalContainer!.style.width = containerWidth + 'px';
  fitAddon.fit();

  return [cols, rows];
}

createTerminal();
