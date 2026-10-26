const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("attendanceUi", {
  getUiMeta: () => ipcRenderer.invoke("getUiMeta"),
  runJob: (request) => ipcRenderer.invoke("runJob", request),
  openPath: (filePath) => ipcRenderer.invoke("openPath", filePath),
  listEmployees: () => ipcRenderer.invoke("roster:list"),
  addEmployee: (input) => ipcRenderer.invoke("roster:add", input),
  removeEmployee: (id) => ipcRenderer.invoke("roster:remove", id),
  updateEmployeeAliases: (id, updates) =>
    ipcRenderer.invoke("roster:updateAliases", id, updates),
  whatsappStatus: () => ipcRenderer.invoke("whatsapp:status"),
  whatsappLogin: () => ipcRenderer.invoke("whatsapp:login"),
  whatsappLogout: () => ipcRenderer.invoke("whatsapp:logout"),
  gmailStatus: () => ipcRenderer.invoke("gmail:status"),
  gmailConnect: () => ipcRenderer.invoke("gmail:connect"),
  listLedgerDays: () => ipcRenderer.invoke("ledger:days"),
  removeLedgerDay: (isoDate) => ipcRenderer.invoke("ledger:removeDay", isoDate),
  onJobLog: (handler) => {
    const listener = (_event, line) => handler(line);
    ipcRenderer.on("job:log", listener);
    return () => ipcRenderer.removeListener("job:log", listener);
  },
  onWhatsappLog: (handler) => {
    const listener = (_event, line) => handler(line);
    ipcRenderer.on("whatsapp:log", listener);
    return () => ipcRenderer.removeListener("whatsapp:log", listener);
  },
  onGmailLog: (handler) => {
    const listener = (_event, line) => handler(line);
    ipcRenderer.on("gmail:log", listener);
    return () => ipcRenderer.removeListener("gmail:log", listener);
  },
});
