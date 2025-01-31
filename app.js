const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

let database = null;

// Initialize the database and server
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    console.log("Database connected successfully!");
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

/*
API 1: Get all players
Path: /players/
Method: GET
*/
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `SELECT * FROM player_details;`;
  const players = await database.all(getPlayersQuery);
  response.json(
    players.map((player) => ({
      playerId: player.player_id,
      playerName: player.player_name,
    }))
  );
});

/*
API 2: Get player by ID
Path: /players/:playerId/
Method: GET
*/
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT * FROM player_details WHERE player_id = ${playerId};`;
  const player = await database.get(getPlayerQuery);
  if (player) {
    response.json({
      playerId: player.player_id,
      playerName: player.player_name,
    });
  } else {
    response.status(404).send("Player Not Found");
  }
});

/*
API 3: Update player details by ID
Path: /players/:playerId/
Method: PUT
*/
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
    UPDATE player_details
    SET player_name = '${playerName}'
    WHERE player_id = ${playerId};`;
  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

/*
API 4: Get match details by ID
Path: /matches/:matchId/
Method: GET
*/
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `SELECT * FROM match_details WHERE match_id = ${matchId};`;
  const match = await database.get(getMatchQuery);
  if (match) {
    response.json({
      matchId: match.match_id,
      match: match.match,
      year: match.year,
    });
  } else {
    response.status(404).send("Match Not Found");
  }
});

/*
API 5: Get all matches of a player
Path: /players/:playerId/matches/
Method: GET
*/
app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesQuery = `
    SELECT match_details.match_id AS matchId, match_details.match AS match, match_details.year AS year
    FROM player_match_score
    INNER JOIN match_details ON player_match_score.match_id = match_details.match_id
    WHERE player_match_score.player_id = ${playerId};`;
  const matches = await database.all(getMatchesQuery);
  response.json(matches);
});

/*
API 6: Get all players of a match
Path: /matches/:matchId/players/
Method: GET
*/
app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersQuery = `
    SELECT player_details.player_id AS playerId, player_details.player_name AS playerName
    FROM player_match_score
    INNER JOIN player_details ON player_match_score.player_id = player_details.player_id
    WHERE player_match_score.match_id = ${matchId};`;
  const players = await database.all(getPlayersQuery);
  response.json(players);
});

/*
API 7: Get player statistics
Path: /players/:playerId/playerScores/
Method: GET
*/
app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getStatsQuery = `
    SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(player_match_score.fours) AS totalFours,
      SUM(player_match_score.sixes) AS totalSixes
    FROM player_match_score
    INNER JOIN player_details ON player_match_score.player_id = player_details.player_id
    WHERE player_details.player_id = ${playerId}
    GROUP BY player_details.player_id;`;
  const stats = await database.get(getStatsQuery);
  if (stats) {
    response.json(stats);
  } else {
    response.status(404).send("Player Not Found");
  }
});

module.exports = app;
