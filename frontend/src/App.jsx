// import { Navigate, Route, Routes } from 'react-router-dom';
// import { useAuth } from './AuthContext.jsx';
// import Layout from './components/Layout.jsx';
// import { Loading } from './components/ui.jsx';
// import Login from './pages/Login.jsx';
// import Dashboard from './pages/Dashboard.jsx';
// import Branches from './pages/Branches.jsx';
// import Departments from './pages/Departments.jsx';
// import Designations from './pages/Designations.jsx';
// import Employees from './pages/Employees.jsx';

// function Protected({ superOnly, children }) {
//   const { user, loading, isSuper } = useAuth();
//   if (loading) return <Loading text="Checking your session…" />;
//   if (!user) return <Navigate to="/login" replace />;
//   if (superOnly && !isSuper) return <Navigate to="/" replace />;
//   return children;
// }

// export default function App() {
//   const { user, loading } = useAuth();
//   return (
//     <Routes>
//       <Route path="/login" element={!loading && user ? <Navigate to="/" replace /> : <Login />} />
//       <Route element={<Protected><Layout /></Protected>}>
//         <Route index element={<Dashboard />} />
//         <Route path="branches" element={<Protected superOnly><Branches /></Protected>} />
//         <Route path="departments" element={<Departments />} />
//         <Route path="designations" element={<Designations />} />
//         <Route path="employees" element={<Employees />} />
//       </Route>
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }

import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Branches from './pages/Branches.jsx';
import Departments from './pages/Departments.jsx';
import Designations from './pages/Designations.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';

function Protected({ allowedRoles, children }) {
  const { user, loading, homePath } = useAuth();

  if (loading) {
    return <Loading text="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.system_role)) {
    return <Navigate to={homePath} replace />;
  }

  return children;
}

function HomeRedirect() {
  const { user } = useAuth();

  if (user?.system_role === 'employee') {
    return <Navigate to="/employee" replace />;
  }

  return <Dashboard />;
}

export default function App() {
  const { user, loading, homePath } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading
            ? <Loading text="Checking your session…" />
            : user
              ? <Navigate to={homePath} replace />
              : <Login />
        }
      />

      {/* Employee-only dashboard, outside the admin Layout */}
      <Route
        path="/employee"
        element={
          <Protected allowedRoles={['employee']}>
            <EmployeeDashboard />
          </Protected>
        }
      />

      {/* Admin and Sub Admin area */}
      <Route
        element={
          <Protected allowedRoles={['super_admin', 'sub_admin']}>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<HomeRedirect />} />

        <Route
          path="branches"
          element={
            <Protected allowedRoles={['super_admin']}>
              <Branches />
            </Protected>
          }
        />

        <Route path="departments" element={<Departments />} />
        <Route path="designations" element={<Designations />} />
        <Route path="employees" element={<Employees />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}