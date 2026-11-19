import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ghazalDesktop', {
  selectFolder: () => ipcRenderer.invoke('ghazal:selectFolder'),
});
