import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fork, ChildProcess } from 'child_process';

let serverProcess: ChildProcess | null = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#F7F5F0',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../web/dist/index.html'));
  }
}

ipcMain.handle('ghazal:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Project Folder to Attach GHAZAL',
  });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(() => {
  serverProcess = fork(path.join(__dirname, '../../server/dist/index.js'));
  createWindow();
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});
