import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5001";

const NFL_TEAMS = [
  "ARI",
  "ATL",
  "BAL",
  "BUF",
  "CAR",
  "CHI",
  "CIN",
  "CLE",
  "DAL",
  "DEN",
  "DET",
  "GB",
  "HOU",
  "IND",
  "JAX",
  "KC",
  "LV",
  "LAC",
  "LAR",
  "MIA",
  "MIN",
  "NE",
  "NO",
  "NYG",
  "NYJ",
  "PHI",
  "PIT",
  "SF",
  "SEA",
  "TB",
  "TEN",
  "WAS",
];

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("nfl_pool_token") || ""
  );

  const [user, setUser] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [picks, setPicks] = useState([]);
  const [games, setGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [selectedTeam, setSelectedTeam] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
  });

  const [timeRemaining, setTimeRemaining] = useState(null);
  const [picksClosed, setPicksClosed] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          userResponse,
          picksResponse,
          gamesResponse,
          leaderboardResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/api/auth/me`, {
            headers,
          }),
          fetch(`${API_URL}/api/picks/me`, {
            headers,
          }),
          fetch(`${API_URL}/api/games/current-week`, {
            headers,
          }),
          fetch(`${API_URL}/api/leaderboard`, {
            headers,
          }),
        ]);

        if (userResponse.status === 401) {
          throw new Error("SESSION_EXPIRED");
        }

        if (
          !userResponse.ok ||
          !picksResponse.ok ||
          !gamesResponse.ok ||
          !leaderboardResponse.ok
        ) {
          throw new Error("Failed to load pool data.");
        }

        const userData = await userResponse.json();
        const userPicks = await picksResponse.json();
        const currentWeekData = await gamesResponse.json();
        const leaderboardData =
          await leaderboardResponse.json();

        setUser(userData);
        setPicks(userPicks);
        setCurrentWeek(currentWeekData.week);
        setGames(currentWeekData.games);
        setLeaderboard(leaderboardData);
        setSelectedTeam("");
      } catch (err) {
        console.error(err);

        if (err.message === "SESSION_EXPIRED") {
          localStorage.removeItem("nfl_pool_token");
          setToken("");
          setUser(null);
          setError(
            "Your session has expired. Please sign in again."
          );
        } else {
          setError("Failed to load pool data.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const currentWeekPick = picks.find(
    (pick) => pick.week.week === currentWeek
  );

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
      const difference =
        new Date(deadline).getTime() - Date.now();

      if (difference <= 0) {
        setTimeRemaining(null);
        setPicksClosed(true);
        return;
      }

      setPicksClosed(false);

      const totalSeconds = Math.floor(
        difference / 1000
      );

      const days = Math.floor(
        totalSeconds / (60 * 60 * 24)
      );

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

    const interval = setInterval(
      updateCountdown,
      1000
    );

    return () => clearInterval(interval);
  }, [deadline]);

  const previouslyUsedTeams = new Set(
    picks
      .filter(
        (pick) => pick.week.week !== currentWeek
      )
      .map((pick) => pick.team)
  );

  const teamsPlayingThisWeek = new Set();

  games.forEach((game) => {
    if (game.homeTeam) {
      teamsPlayingThisWeek.add(game.homeTeam);
    }

    if (game.awayTeam) {
      teamsPlayingThisWeek.add(game.awayTeam);
    }
  });

  const availableTeams = NFL_TEAMS.filter(
    (team) =>
      teamsPlayingThisWeek.has(team) &&
      !previouslyUsedTeams.has(team)
  );

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setAuthLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: authForm.username.trim(),
            password: authForm.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to sign in."
        );
      }

      localStorage.setItem(
        "nfl_pool_token",
        data.token
      );

      setToken(data.token);
      setUser(data.user);

      setAuthForm({
        username: "",
        password: "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("nfl_pool_token");

    setToken("");
    setUser(null);
    setCurrentWeek(null);
    setPicks([]);
    setGames([]);
    setLeaderboard([]);
    setSelectedTeam("");
    setMessage("");
    setError("");
  }

  async function savePick() {
    setMessage("");
    setError("");

    if (picksClosed) {
      setError("Picks are closed.");
      return;
    }

    if (!selectedTeam) {
      setError("Please select a team.");
      return;
    }

    if (!currentWeek) {
      setError(
        "The current NFL week could not be determined."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/picks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            week: currentWeek,
            team: selectedTeam,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save pick."
        );
      }

      setMessage(
        currentWeekPick
          ? `Pick changed to ${selectedTeam}.`
          : `Pick saved: ${selectedTeam}.`
      );

      setPicks((currentPicks) => {
        const existingPick = currentPicks.find(
          (pick) =>
            pick.week.week === currentWeek
        );

        if (existingPick) {
          return currentPicks.map((pick) =>
            pick.id === existingPick.id
              ? data
              : pick
          );
        }

        return [...currentPicks, data];
      });

      setSelectedTeam("");

      const leaderboardResponse =
        await fetch(
          `${API_URL}/api/leaderboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (leaderboardResponse.ok) {
        const leaderboardData =
          await leaderboardResponse.json();

        setLeaderboard(leaderboardData);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <div className="app auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Combine Plant NFL Pool</h1>
            <p>2026 Season</p>
          </div>

          <div className="auth-card">
            <h2>Sign in</h2>

            <p className="auth-description">
              Sign in to make your weekly pick.
            </p>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">
                  Username
                </label>

                <input
                  id="username"
                  type="text"
                  value={authForm.username}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      username:
                        event.target.value,
                    })
                  }
                  placeholder="Username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      password:
                        event.target.value,
                    })
                  }
                  placeholder="Password"
                  required
                />
              </div>

              <button
                className="auth-button"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Signing in..."
                  : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app loading-page">
        <div className="loading">
          Loading your pool...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>Combine Plant NFL Pool</h1>
            <p>2026 Season</p>
          </div>

          <div className="account">
            <span>{user?.name}</span>

            <button
              className="logout-button"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <section className="card">
          <h2>Week {currentWeek}</h2>

          {picksClosed ? (
            <div className="deadline closed">
              🔒 Picks are closed
            </div>
          ) : timeRemaining ? (
            <div className="deadline">
              ⏰ Picks close in{" "}
              <strong>
                {timeRemaining.days}d{" "}
                {timeRemaining.hours}h{" "}
                {timeRemaining.minutes}m{" "}
                {timeRemaining.seconds}s
              </strong>
            </div>
          ) : null}

          {currentWeekPick ? (
            <div className="current-pick">
              <span>Your current pick</span>
              <strong>
                {currentWeekPick.team}
              </strong>
            </div>
          ) : (
            <p>
              You haven't made your pick yet.
            </p>
          )}

          <div className="pick-section">
            <h3>
              {currentWeekPick
                ? "Change your pick"
                : "Select your team"}
            </h3>

            <select
              value={selectedTeam}
              onChange={(event) =>
                setSelectedTeam(
                  event.target.value
                )
              }
              disabled={picksClosed}
            >
              <option value="">
                Choose a team
              </option>

              {availableTeams.map((team) => (
                <option
                  key={team}
                  value={team}
                >
                  {team}
                </option>
              ))}
            </select>

            <button
              onClick={savePick}
              disabled={picksClosed}
            >
              {currentWeekPick
                ? "Change Pick"
                : "Save Pick"}
            </button>
          </div>
        </section>

        <section className="leaderboard">
          <h2>Leaderboard</h2>

          {leaderboard.map(
            (player, index) => (
              <div
                className="leaderboard-row"
                key={player.userId}
              >
                <span className="leaderboard-rank">
                  {index + 1}
                </span>

                <span className="leaderboard-name">
                  {player.name}
                </span>

                <span className="leaderboard-points">
                  {player.points}{" "}
                  {player.points === 1
                    ? "pt"
                    : "pts"}
                </span>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
}

export default App;