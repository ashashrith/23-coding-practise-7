const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3005, () => {
      console.log("Server Running at http://localhost:3005/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/players/", async (request, response) => {
  const listOfPlayers = `
    SELECT player_id as playerId, player_name as playerName FROM player_details`;
  const listOfPlayersResponse = await db.all(listOfPlayers);
  response.send(listOfPlayersResponse);
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const player = `
    SELECT player_id as playerId, player_name as playerName FROM player_details
    WHERE player_id = ${playerId};`;
  const playerResponse = await db.get(player);
  response.send(playerResponse);
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
    UPDATE player_details SET 
    player_name = ${playerName} 
    WHERE player_id = ${playerId};`;

  await db.run(updatePlayerQuery);
  response.send("Player Details Updates");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `
    SELECT match_id as matchId, match, year FROM match_details
    WHERE match_id = '${matchId}';`;
  const matchDetailsResponse = await db.get(getMatchDetails);
  response.send(matchDetailsResponse);
});

const convert = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    role: dbObject.role,
  };
};

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
    SELECT * FROM player_match_score
    NATURAL JOIN match_details WHERE
    player_id = ${playerId};`;

  const playerMatches = await db.all(getPlayerMatchesQuery);
  response.send(playerMatches.map((eachMatch) => convert(eachMatch)));
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getListOfPlayers = `SELECT player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`;
  const playersResponse = await db.get(getListOfPlayers);
  response.send(playersResponse);
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStats = `
    SELECT player_details.player_id as playerId, player_details.player_name as playerName, 
    sum(player_match_score.score) as totalScore, sum(fours) as totalFours,
    sum(sixes) as totalSixes FROM player_details INNER JOIN 
    player_match_score ON player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;
  const playerStatResponse = await db.get(getPlayerStats);
  response.send(playerStatResponse);
});

module.exports = app;
