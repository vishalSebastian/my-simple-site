import { useState } from 'react';

// Fake login: username "student", password "Password123"
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!username) return setError('Username is required');
    if (!password) return setError('Password is required');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (username === 'student' && password === 'Password123') setLoggedIn(true);
      else setError('Invalid username or password');
    }, 1500);
  };

  if (loggedIn) {
    return (
      <section>
        <h1 data-testid="welcome">Welcome, {username}!</h1>
        <p>You are logged in.</p>
        <button onClick={() => { setLoggedIn(false); setPassword(''); }} data-testid="logout">Log out</button>
      </section>
    );
  }

  return (
    <section>
      <h1>Login</h1>
      <p>Use username <code>student</code> and password <code>Password123</code>.</p>
      <form onSubmit={submit} className="form" noValidate>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} data-testid="username" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="password" />
        <button type="submit" disabled={loading} data-testid="login-button">
          {loading ? 'Logging in...' : 'Log in'}
        </button>
        {error && <p role="alert" className="error" data-testid="error">{error}</p>}
      </form>
    </section>
  );
}
