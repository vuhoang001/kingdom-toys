const http = require("http");
const app = require("./src/app");
const { configs } = require("./src/configs/index");
const { initSocket } = require("./src/socket/socket");

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(configs.PORT, () => {
  console.log("app is running ...", configs.PORT);
});
