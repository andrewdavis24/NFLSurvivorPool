import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

const NFL_TEAMS = [
  { abbreviation: "ARI", name: "Arizona Cardinals" },
  { abbreviation: "ATL", name: "Atlanta Falcons" },
  { abbreviation: "BAL", name: "Baltimore Ravens" },
  { abbreviation: "BUF", name: "Buffalo Bills" },
  { abbreviation: "CAR", name: "Carolina Panthers" },
  { abbreviation: "CHI", name: "Chicago Bears" },
  { abbreviation: "CIN", name: "Cincinnati Bengals" },
  { abbreviation: "CLE", name: "Cleveland Browns" },
  { abbreviation: "DAL", name: "Dallas Cowboys" },
  { abbreviation: "DEN", name: "Denver Broncos" },
  { abbreviation: "DET", name: "Detroit Lions" },
  { abbreviation: "GB", name: "Green Bay Packers" },
  { abbreviation: "HOU", name: "Houston Texans" },
  { abbreviation: "IND", name: "Indianapolis Colts" },
  { abbreviation: "JAX", name: "Jacksonville Jaguars" },
  { abbreviation: "KC", name: "Kansas City Chiefs" },
  { abbreviation: "LV", name: "Las Vegas Raiders" },
  { abbreviation: "LAC", name: "Los Angeles Chargers" },
  { abbreviation: "LAR", name: "Los Angeles Rams" },
  { abbreviation: "MIA", name: "Miami Dolphins" },
  { abbreviation: "MIN", name: "Minnesota Vikings" },
  { abbreviation: "NE", name: "New England Patriots" },
  { abbreviation: "NO", name: "New Orleans Saints" },
  { abbreviation: "NYG", name: "New York Giants" },
  { abbreviation: "NYJ", name: "New York Jets" },
  { abbreviation: "PHI", name: "Philadelphia Eagles" },
  { abbreviation: "PIT", name: "Pittsburgh Steelers" },
  { abbreviation: "SF", name: "San Francisco 49ers" },
  { abbreviation: "SEA", name: "Seattle Seahawks" },
  { abbreviation: "TB", name: "Tampa Bay Buccaneers" },
  { abbreviation: "TEN", name: "Tennessee Titans" },
  { abbreviation: "WAS", name: "Washington Commanders" },
];

function getTeamName(abbreviation) {
  return (
    NFL_TEAMS.find(
      (team) =>
        team.abbreviation === abbreviation
    )?.name || abbreviation
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray =
    new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] =
      rawData.charCodeAt(i);
  }

  return outputArray;
}

async function enablePushNotifications(token) {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    throw new Error(
      "Push notifications are not supported on this device."
    );
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted."
    );
  }

  const registration =
    await navigator.serviceWorker.register(
      "/sw.js"
    );

  const response = await fetch(
    `${API_URL}/api/push/public-key`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to get push notification settings."
    );
  }

  const { publicKey } =
    await response.json();

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(
            publicKey
          ),
      });
  }

  const subscriptionJSON =
    subscription.toJSON();

  const subscribeResponse =
    await fetch(
      `${API_URL}/api/push/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint:
            subscriptionJSON.endpoint,
          keys: subscriptionJSON.keys,
        }),
      }
    );

  if (!subscribeResponse.ok) {
    throw new Error(
      "Failed to enable push notifications."
    );
  }
}

function App() {
  const [token, setToken] = useState(
    () =>
      localStorage.getItem(
        "nfl_pool_token"
      ) || ""
  );

  const [user, setUser] = useState(null);
  const [currentWeek, setCurrentWeek] =
    useState(null);

  const [picks, setPicks] = useState([]);
  const [weeklyPicks, setWeeklyPicks] =
    useState([]);

  const [games, setGames] = useState([]);
  const [leaderboard, setLeaderboard] =
    useState([]);

  const [selectedTeam, setSelectedTeam] =
    useState("");

  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(true);
  const [authLoading, setAuthLoading] =
    useState(false);
  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(
    typeof Notification !==
      "undefined" &&
      Notification.permission ===
        "granted"
  );

  const [authForm, setAuthForm] =
    useState({
      username: "",
      password: "",
    });

  const [timeRemaining, setTimeRemaining] =
    useState(null);

  const [picksClosed, setPicksClosed] =
    useState(false);

  /*
   * Load application data
   */
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
          fetch(
            `${API_URL}/api/auth/me`,
            { headers }
          ),
          fetch(
            `${API_URL}/api/picks/me`,
            { headers }
          ),
          fetch(
            `${API_URL}/api/games/current-week`,
            { headers }
          ),
          fetch(
            `${API_URL}/api/leaderboard`,
            { headers }
          ),
        ]);

        if (
          userResponse.status === 401 ||
          picksResponse.status === 401
        ) {
          throw new Error(
            "SESSION_EXPIRED"
          );
        }

        if (
          !userResponse.ok ||
          !picksResponse.ok ||
          !gamesResponse.ok ||
          !leaderboardResponse.ok
        ) {
          throw new Error(
            "Failed to load pool data."
          );
        }

        const userData =
          await userResponse.json();

        const userPicks =
          await picksResponse.json();

        const currentWeekData =
          await gamesResponse.json();

        const leaderboardData =
          await leaderboardResponse.json();

        setUser(userData);
        setPicks(userPicks);

        setCurrentWeek(
          currentWeekData.week
        );

        setGames(
          currentWeekData.games || []
        );

        setLeaderboard(
          leaderboardData
        );

        setSelectedTeam("");
      } catch (err) {
        console.error(err);

        if (
          err.message ===
          "SESSION_EXPIRED"
        ) {
          localStorage.removeItem(
            "nfl_pool_token"
          );

          setToken("");
          setUser(null);

          setError(
            "Your session has expired. Please sign in again."
          );
        } else {
          setError(
            "Failed to load pool data."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  /*
   * Current week's pick
   */
  const currentWeekPick =
    picks.find(
      (pick) =>
        pick.week.week ===
        currentWeek
    );

  /*
   * Pick deadline
   */
  const deadline = games
    .filter(
      (game) => game.startTime
    )
    .sort(
      (a, b) =>
        new Date(
          a.startTime
        ).getTime() -
        new Date(
          b.startTime
        ).getTime()
    )[0]?.startTime;

  /*
   * Countdown
   */
  useEffect(() => {
    if (!deadline) return;

    function updateCountdown() {
      const difference =
        new Date(
          deadline
        ).getTime() -
        Date.now();

      if (difference <= 0) {
        setTimeRemaining(null);
        setPicksClosed(true);
        return;
      }

      setPicksClosed(false);

      const totalSeconds =
        Math.floor(
          difference / 1000
        );

      const days =
        Math.floor(
          totalSeconds /
            (60 * 60 * 24)
        );

      const hours =
        Math.floor(
          (totalSeconds %
            (60 * 60 * 24)) /
            (60 * 60)
        );

      const minutes =
        Math.floor(
          (totalSeconds %
            (60 * 60)) /
            60
        );

      const seconds =
        totalSeconds % 60;

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
      });
    }

    updateCountdown();

    const interval =
      setInterval(
        updateCountdown,
        1000
      );

    return () =>
      clearInterval(interval);
  }, [deadline]);

  /*
   * Fetch everyone's picks once
   * the weekly deadline has passed.
   */
  useEffect(() => {
    async function loadWeeklyPicks() {
      if (!token || !currentWeek) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/weekly-picks/${currentWeek}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (data.locked) {
          setWeeklyPicks(
            data.picks || []
          );
        } else {
          setWeeklyPicks([]);
        }
      } catch (err) {
        console.error(
          "Failed to load weekly picks:",
          err
        );
      }
    }

    loadWeeklyPicks();
  }, [
    token,
    currentWeek,
    picksClosed,
  ]);

  /*
   * Teams already used by this user.
   */
  const previouslyUsedTeams =
    new Set(
      picks
        .filter(
          (pick) =>
            pick.week.week !==
            currentWeek
        )
        .map(
          (pick) => pick.team
        )
    );

  /*
   * Teams playing this week.
   */
  const teamsPlayingThisWeek =
    new Set();

  games.forEach((game) => {
    if (game.homeTeam) {
      teamsPlayingThisWeek.add(
        game.homeTeam
      );
    }

    if (game.awayTeam) {
      teamsPlayingThisWeek.add(
        game.awayTeam
      );
    }
  });

  /*
   * Available teams.
   */
  const availableTeams =
    NFL_TEAMS.filter(
      (team) =>
        teamsPlayingThisWeek.has(
          team.abbreviation
        ) &&
        !previouslyUsedTeams.has(
          team.abbreviation
        )
    );

  /*
   * Login
   */
  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setAuthLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              username:
                authForm.username.trim(),
              password:
                authForm.password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to sign in."
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

  /*
   * Logout
   */
  function logout() {
    localStorage.removeItem(
      "nfl_pool_token"
    );

    setToken("");
    setUser(null);
    setCurrentWeek(null);
    setPicks([]);
    setWeeklyPicks([]);
    setGames([]);
    setLeaderboard([]);
    setSelectedTeam("");
    setMessage("");
    setError("");
  }

  /*
   * Enable notifications
   */
  async function handleEnableNotifications() {
    setNotificationLoading(true);
    setError("");
    setMessage("");

    try {
      await enablePushNotifications(
        token
      );

      setNotificationsEnabled(true);

      setMessage(
        "Push notifications are enabled!"
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setNotificationLoading(false);
    }
  }

  /*
   * Save / change pick
   */
  async function savePick() {
    setMessage("");
    setError("");

    if (picksClosed) {
      setError("Picks are closed.");
      return;
    }

    if (!selectedTeam) {
      setError(
        "Please select a team."
      );
      return;
    }

    if (!currentWeek) {
      setError(
        "The current NFL week could not be determined."
      );
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/api/picks`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              week: currentWeek,
              team: selectedTeam,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save pick."
        );
      }

      setMessage(
        currentWeekPick
          ? `Pick changed to ${getTeamName(
              selectedTeam
            )}.`
          : `Pick saved: ${getTeamName(
              selectedTeam
            )}.`
      );

      setPicks(
        (currentPicks) => {
          const existingPick =
            currentPicks.find(
              (pick) =>
                pick.week.week ===
                currentWeek
            );

          if (existingPick) {
            return currentPicks.map(
              (pick) =>
                pick.id ===
                existingPick.id
                  ? data
                  : pick
            );
          }

          return [
            ...currentPicks,
            data,
          ];
        }
      );

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

      if (
        leaderboardResponse.ok
      ) {
        const leaderboardData =
          await leaderboardResponse.json();

        setLeaderboard(
          leaderboardData
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  /*
   * Login screen
   */
  if (!token) {
    return (
      <div className="app auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="brand-mark">
              🏈
            </div>

            <h1>
              Combine Plant
              <br />
              NFL Pool
            </h1>

            <p>
              2026 Season
            </p>
          </div>

          <div className="auth-card">
            <h2>
              Welcome back
            </h2>

            <p className="auth-description">
              Sign in to make your
              weekly pick.
            </p>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <form
              onSubmit={
                handleLogin
              }
            >
              <div className="form-group">
                <label htmlFor="username">
                  Username
                </label>

                <input
                  id="username"
                  type="text"
                  value={
                    authForm.username
                  }
                  onChange={(
                    event
                  ) =>
                    setAuthForm({
                      ...authForm,
                      username:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Username"
                  autoComplete="username"
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
                  value={
                    authForm.password
                  }
                  onChange={(
                    event
                  ) =>
                    setAuthForm({
                      ...authForm,
                      password:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                className="auth-button"
                type="submit"
                disabled={
                  authLoading
                }
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

  /*
   * Loading screen
   */
  if (loading) {
    return (
      <div className="app loading-page">
        <div className="loading">
          Loading your pool...
        </div>
      </div>
    );
  }

  /*
   * Main application
   */
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">
              🏈
            </div>

            <div>
              <h1>
                Combine Plant
                NFL Pool
              </h1>

              <p>
                2026 Season
              </p>
            </div>
          </div>

          <div className="account">
            <span className="welcome-user">
              Hey, {user?.name}
            </span>

            <button
              className={
                notificationsEnabled
                  ? "notification-button enabled"
                  : "notification-button"
              }
              onClick={
                handleEnableNotifications
              }
              disabled={
                notificationLoading ||
                notificationsEnabled
              }
            >
              {notificationsEnabled && (
                <button
                  className="test-notification-button"
                  onClick={async () => {
                    setMessage("");
                    setError("");

                    try {
                      setMessage(
                        "Sending test notification..."
                      );

                      const response =
                        await fetch(
                          `${API_URL}/api/push/test`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type":
                                "application/json",
                            },
                          }
                        );

                      const text =
                        await response.text();

                      let data = {};

                      try {
                        data = JSON.parse(text);
                      } catch {
                        data = {
                          error: text,
                        };
                      }

                      console.log(
                        "Push test response:",
                        response.status,
                        data
                      );

                      if (!response.ok) {
                        throw new Error(
                          data.error ||
                            `Server returned ${response.status}`
                        );
                      }

                      setMessage(
                        "✅ Test notification sent. Check your phone!"
                      );
                    } catch (err) {
                      console.error(
                        "Push test failed:",
                        err
                      );

                      setError(
                        err.message ||
                          "Failed to send test notification."
                      );

                      setMessage("");
                    }
                  }}
                >
                  🧪 Test Notification
                </button>
              )}
              {notificationLoading
                ? "Enabling..."
                : notificationsEnabled
                ? "🔔 Notifications On"
                : "🔔 Enable Notifications"}
            </button>

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

        {/* Current week / pick */}
        <section className="card pick-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                CURRENT WEEK
              </span>

              <h2>
                Week {currentWeek}
              </h2>
            </div>

            <div className="week-badge">
              2026
            </div>
          </div>

          {picksClosed ? (
            <div className="deadline closed">
              <span>
                🔒
              </span>

              <div>
                <strong>
                  Picks are locked
                </strong>

                <small>
                  Check below to see
                  everyone's picks.
                </small>
              </div>
            </div>
          ) : timeRemaining ? (
            <div className="deadline">
              <span>
                ⏰
              </span>

              <div>
                <strong>
                  {timeRemaining.days}d{" "}
                  {timeRemaining.hours}h{" "}
                  {timeRemaining.minutes}m{" "}
                  {timeRemaining.seconds}s
                </strong>

                <small>
                  until picks lock
                </small>
              </div>
            </div>
          ) : null}

          {currentWeekPick ? (
            <div className="current-pick">
              <span>
                YOUR CURRENT PICK
              </span>

              <strong>
                {getTeamName(
                  currentWeekPick.team
                )}
              </strong>

              <small>
                You can change this
                until picks lock.
              </small>
            </div>
          ) : (
            <div className="no-pick">
              <span className="no-pick-icon">
                🏈
              </span>

              <div>
                <strong>
                  You haven't made
                  your pick yet
                </strong>

                <p>
                  Choose a team below
                  before the deadline.
                </p>
              </div>
            </div>
          )}

          {!picksClosed && (
            <div className="pick-section">
              <div className="pick-section-heading">
                <h3>
                  {currentWeekPick
                    ? "Change your pick"
                    : "Select your team"}
                </h3>

                <span>
                  {
                    availableTeams.length
                  }{" "}
                  teams available
                </span>
              </div>

              <div className="pick-controls">
                <select
                  value={
                    selectedTeam
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedTeam(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    picksClosed
                  }
                >
                  <option value="">
                    Choose a team
                  </option>

                  {availableTeams.map(
                    (team) => (
                      <option
                        key={
                          team.abbreviation
                        }
                        value={
                          team.abbreviation
                        }
                      >
                        {team.name}
                      </option>
                    )
                  )}
                </select>

                <button
                  className="save-pick-button"
                  onClick={
                    savePick
                  }
                  disabled={
                    !selectedTeam
                  }
                >
                  {currentWeekPick
                    ? "Change Pick"
                    : "Save Pick"}
                </button>
              </div>

              <p className="pick-note">
                You can only use each
                team once during the
                season.
              </p>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className="leaderboard card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                SEASON STANDINGS
              </span>

              <h2>
                Leaderboard
              </h2>
            </div>

            <span className="trophy">
              🏆
            </span>
          </div>

          <div className="leaderboard-list">
            {leaderboard.map(
              (player, index) => (
                <div
                  className={`leaderboard-row ${
                    index === 0
                      ? "leader"
                      : ""
                  }`}
                  key={
                    player.userId
                  }
                >
                  <div className="rank">
                    {index ===
                    0
                      ? "👑"
                      : index + 1}
                  </div>

                  <div className="player-info">
                    <span className="player-name">
                      {
                        player.name
                      }
                    </span>

                    {index ===
                      0 && (
                      <span className="leader-label">
                        Leading the pool
                      </span>
                    )}
                  </div>

                  <div className="player-points">
                    <strong>
                      {
                        player.points
                      }
                    </strong>

                    <span>
                      {player.points ===
                      1
                        ? "point"
                        : "points"}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Weekly picks reveal */}
        {picksClosed &&
          weeklyPicks.length > 0 && (
            <section className="card weekly-picks">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    PICKS ARE LOCKED
                  </span>

                  <h2>
                    Week {currentWeek} Picks 👀
                  </h2>
                </div>

                <span className="locked-badge">
                  🔒 Locked
                </span>
              </div>

              <div className="weekly-picks-list">
                {weeklyPicks.map(
                  (pick) => (
                    <div
                      className="weekly-pick-row"
                      key={
                        pick.userId
                      }
                    >
                      <span className="weekly-player">
                        {
                          pick.name
                        }
                      </span>

                      <strong>
                        🏈{" "}
                        {getTeamName(
                          pick.team
                        )}
                      </strong>

                      {pick.result && (
                        <span
                          className={
                            pick.result ===
                            "WIN"
                              ? "pick-result win"
                              : "pick-result loss"
                          }
                        >
                          {pick.result ===
                          "WIN"
                            ? "✓ WIN"
                            : "✕ LOSS"}
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}
      </main>
    </div>
  );
}

export default App;