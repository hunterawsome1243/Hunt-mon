const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Internal res is 240x160 (3:2); 960x640 is an integer 4x zoom.
function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    useContentSize: true,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
