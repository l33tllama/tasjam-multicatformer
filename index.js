const express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
app.use("/js", express.static('./js'))
app.use("/meshes", express.static('./meshes'))
app.use("/res", express.static('./res'))

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

let players = [];

let game_state = "playing";
let leaderboard = [];

// Browser connected
io.on('connection', function(socket) {
    socket.join('game-updates');
    //socket.emit('announcements', { message: 'A new user has joined!' });
    
    // A player joins
    socket.on('join', function(data) {
        console.log('A client joined the game:', data.message, " uuid: ", data.player_id);
        players.push(data);
        io.to('game-updates').emit("join", {data: data, 
            players: players, 
            leaderboard: leaderboard,
            game_state: game_state});
    });

    socket.on('player_update', function(data){
        io.to('game-updates').emit('player_update', data);
    });
    
    // Player sends a name update with uuid and name
    socket.on('update_name', function(data){
        for(let i = 0; i < players.length; i++){
            if(players[i] !=undefined){
                if(players[i].player_id == data.uuid){
                    console.log("Player name update: " + data.name)
                    players[i].player_name = data.name;
                }
            }
           
        }
        io.to('game-updates').emit('new_name', data);
    });

    // A player finishes the race!
    socket.on('player-finishes', function(data){
        console.log("Player finished: ")
        console.log(data)
        // game not over
        if(game_state == "playing"){
            leaderboard.push(data);
            console.log("playing?")
            // increase finished count
            for(let i = 0; i < players.length; i++){
                console.log(players[i]);
                if(players[i] != undefined){
                    if(data.uuid == players[i].player_id){
                        console.log("A player finshed! " + data.player_name)
                        
                    }
                }
            }
            console.log("Finished count: " + leaderboard.length + " players len: " + players.length)
            // check if game over
            if(leaderboard.length == players.length){
                game_state = "ended";
                io.to('game-updates').emit('game_over', leaderboard);
            } else{
                io.to('game-updates').emit('player_finished', leaderboard);
            }
        }
    })
    
    // A player quits
    socket.on("quit", function(data){
        console.log("A player quit");
        //let player_index = 0;
        for(let i = 0; i < players.length; i++){
            if (players[i] != null && players[i].player_id == data.player_id){
                io.to('game-updates').emit("quit", {player_id: data.player_id});
                players.splice(i, 1);
                console.log("player deleted");
            }
        }
    })

    socket.on("game-restart", function(data){
        console.log("Restarting game")
        game_state = "playing";
        players = [];
        leaderboard = [];
        io.to('game-updates').emit('restart-game');
    });
    /*
    socket.on('whos-online', function(data){
        console.log("Sending who's online")
        
    });*/
});
io.on('disconnect', function(){
    //
})

server.listen(8080);