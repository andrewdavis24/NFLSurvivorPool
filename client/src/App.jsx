import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5001";

function App() {
  const [user, setUser] = useState(null);
  const [picks, setPicks] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [picksClosed, setPicksClosed] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [usersResponse, picksResponse, gamesResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/users`),
            fetch(`${API_URL}/api/picks/1`),
            fetch(`${API_URL}/api/games/2`),
          ]);

        const users = await usersResponse.json();
        const userPicks = await picksResponse.json();
        const weekGames = await gamesResponse.json();

        setUser(users.find((user) => user.id === 1));
        setPicks(userPicks);
        setGames(weekGames);
      } catch (err) {
        console.error(err);
        setError("Failed to load pool data.");
      }
    }

    loadData();
  }, []);

  const weekTwoPick = picks.find((pick) => pick.week.week === 2);

  const deadline = games
  .filter((game) => game.startTime)
  .sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  )[0]?.startTime;

  useEffect(() => {
  if (!deadline) return;

  function updateCountdown() {
    const difference = new Date(deadline).getTime() - Date.now();

    if (difference <= 0) {
      setTimeRemaining(null);
      setPicksClosed(true);
      return;
    }

    setPicksClosed(false);

    const totalSeconds = Math.floor(difference / 1000);

    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor(
      (totalSeconds % (60 * 60 * 24)) / (60 * 60)
    );
    const minutes = Math.floor(
      (totalSeconds % (60 * 60)) / 60
    );
    const seconds = totalSeconds % 60;

    setTimeRemaining({
      days,
      hours,
      minutes,
      seconds,
    });
  }

  updateCountdown();

  const interval = setInterval(updateCountdown, 1000);

  return () => clearInterval(interval);
}, [deadline]);

  const teamsPlayingThisWeek = games.flatMap((game) => [
    game.homeTeam,
    game.awayTeam,
  ]);

  const teamsUsedPreviously = picks
    .filter((pick) => pick.week.week !== 2)
    .map((pick) => pick.team);

  const availableTeams = [...new Set(teamsPlayingThisWeek)].filter(
    (team) => !teamsUsedPreviously.includes(team)
  );

  async function savePick() {
      if (picksClosed) {
    setError("Picks are closed.");
    return;
  }
    if (!selectedTeam) {
      setError("Please select a team.");
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/api/picks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1,
          week: 2,
          team: selectedTeam,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save pick.");
        return;
      }

      setPicks((currentPicks) => {
        const otherPicks = currentPicks.filter(
          (pick) => pick.week.week !== 2
        );

        return [...otherPicks, data];
      });

      setSelectedTeam("");
      setMessage(`Your Week 2 pick is ${data.team}.`);
    } catch (err) {
      console.error(err);
      setError("Failed to save pick.");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Combine Plant NFL Pool</h1>
        <p>2026 Season</p>
      </header>

      <main className="container">
        {error && <div className="error">{error}</div>}
        {message && <div className="message">{message}</div>}

        <section className="card">
          <h2>Welcome{user ? `, ${user.name}` : ""}</h2>
          <p>Make your Week 2 pick before the games begin.</p>
        </section>

        <section className="card">
          <h2>Week 2</h2>
          {picksClosed ? (
  <div className="deadline closed">
    🔒 Picks are closed
  </div>
) : timeRemaining ? (
  <div className="deadline">
    ⏰ Picks close in{" "}
    <strong>
      {timeRemaining.days}d {timeRemaining.hours}h{" "}
      {timeRemaining.minutes}m {timeRemaining.seconds}s
    </strong>
  </div>
) : null}
          {weekTwoPick ? (
            <div className="current-pick">
              <span>Your current pick</span>
              <strong>{weekTwoPick.team}</strong>
            </div>
          ) : (
            <p>You haven't made a pick yet.</p>
          )}

          <div className="pick-section">
            <h3>Select your team</h3>

            <select
  value={selectedTeam}
  onChange={(event) => setSelectedTeam(event.target.value)}
  disabled={picksClosed}
>
              <option value="">Choose a team</option>

              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            <button onClick={savePick} disabled={picksClosed}>
              {weekTwoPick ? "Change Pick" : "Save Pick"}
            </button>
          </div>

          <p className="game-count">
            {games.length} games loaded
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;