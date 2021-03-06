const express = require("express");
const path = require("path");

const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

let rooms = 0;
delete require.cache[require.resolve("socket.io")];
delete require.cache[require.resolve("http")];
delete require.cache[require.resolve("express")];

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/game.html"));
});

io.on("connection", socket => {
  socket.on("createGame", data => {
    socket.join(`${++rooms}`);
    socket.emit("newGame", { name: "Player0", room: `${rooms}` });
  });

  socket.on("createCPUGame", data => {
    socket.join(`${++rooms}`);
    socket.emit("newCPUGame", { name: "Player0", room: `${rooms}` });
    socket.join(`${++rooms}`);
    socket.emit("cpuPlayer", { room: `${rooms}` });
  });

  // Connect the Player 2 to the room he requested. Show error if room full.
  socket.on("joinGame", data => {
    var room = io.nsps["/"].adapter.rooms[data.room];
    if (room && room.length === 1) {
      socket.join(data.room);
      socket.broadcast.to(data.room).emit("player0", { room: data.room });
      socket.emit("player1", { name: data.name, room: data.room });
    } else {
      socket.emit("err", { message: "Sorry, The room is full!" });
    }
  });

  socket.on("init", data => {
    if (data.isSingle) {
      socket.emit("initReceive", {
        cells: data.cells
      });
    } else {
      socket.broadcast.to(data.room).emit("initReceive", {
        cells: data.cells
      });
    }
  });
  socket.on("sync", data => {
    socket.broadcast.to(data.room).emit("syncTile", {
      cells: data.cells
    });
  });

  /**
   * Handle the turn played by either player and notify the other.
   */
  socket.on("playTurn", data => {
    socket.broadcast.to(data.room).emit("turnPlayed", {
      tile: data.tile,
      room: data.room
    });
  });

  /**
   * Notify the players about the victor.
   */
  socket.on("gameEnded", data => {
    socket.broadcast.to(data.room).emit("gameEnd", data);
  });
});

server.listen(process.env.PORT || 8080);
