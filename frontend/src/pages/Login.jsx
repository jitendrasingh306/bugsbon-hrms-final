// import { useState } from 'react';
// import { useAuth } from '../AuthContext.jsx';
// import { Notice, TextField } from '../components/ui.jsx';

// export default function Login() {
//   const { login } = useAuth();
//   const [form, setForm] = useState({ email: '', password: '' });
//   const [errors, setErrors] = useState({});
//   const [notice, setNotice] = useState(null);
//   const [busy, setBusy] = useState(false);

//   const submit = async (e) => {
//     e.preventDefault();
//     setErrors({}); setNotice(null); setBusy(true);
//     try {
//       await login(form.email, form.password);
//     } catch (err) {
//       setErrors(err.fields || {});
//       setNotice({ type: 'error', text: err.message });
//     } finally { setBusy(false); }
//   };

//   return (
//     <div className="login-wrap">
//       <form className="card login-card" onSubmit={submit} noValidate>
//         <h1>Bugsbon HRMS</h1>
//         <p className="muted">Log in as Super Admin or branch Sub Admin.</p>
//         <Notice notice={notice} />
//         <TextField label="Email" type="email" autoComplete="username" required value={form.email} error={errors.email}
//           onChange={(e) => setForm({ ...form, email: e.target.value })} />
//         <TextField label="Password" type="password" autoComplete="current-password" required value={form.password} error={errors.password}
//           onChange={(e) => setForm({ ...form, password: e.target.value })} />
//         <button className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
//       </form>
//     </div>
//   );
// }


import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { Notice, TextField } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setErrors({});
    setNotice(null);
    setBusy(true);

    try {
      await login(form.email, form.password);
      // App.jsx redirects based on the logged-in user's role.
    } catch (err) {
      setErrors(err.fields || {});
      setNotice({
        type: 'error',
        text: err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit} noValidate>
        <h1>Bugsbon HRMS</h1>
        <p className="muted">
          Log in with your registered work email and password.
        </p>

        <Notice notice={notice} />

        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={form.email}
          error={errors.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          error={errors.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}