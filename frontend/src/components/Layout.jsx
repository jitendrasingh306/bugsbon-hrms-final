// import { NavLink, Outlet } from 'react-router-dom';
// import { useAuth } from '../AuthContext.jsx';

// export default function Layout() {
//   const { user, isSuper, logout } = useAuth();
//   const links = [
//     ['/', 'Dashboard', true],
//     ...(isSuper ? [['/branches', 'Branches']] : []),
//     ['/departments', 'Departments'],
//     ['/designations', 'Designations'],
//     ['/employees', 'Employees'],
//   ];
//   return (
//     <div className="shell">
//       <aside className="sidebar">
//         <div className="brand">Bugsbon HRMS</div>
//         <nav aria-label="Main">
//           {links.map(([to, label, end]) => (
//             <NavLink key={to} to={to} end={end}>{label}</NavLink>
//           ))}
//         </nav>
//         <div className="who">
//           <strong>{user.name}</strong>
//           <span>{isSuper ? 'Super Admin' : 'Branch Sub Admin'}</span>
//           <button type="button" className="btn btn-ghost" onClick={logout}>Log out</button>
//         </div>
//       </aside>
//       <main className="content"><Outlet /></main>
//     </div>
//   );
// }

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout() {
  const { user, isSuper, logout } = useAuth();

  const links = isSuper
  ? [
      ['/', 'Dashboard', true],
      ['/branches', 'Branches'],
    ]
  : [
      ['/', 'Dashboard', true],
      ['/departments', 'Departments'],
      ['/designations', 'Designations'],
      ['/employees', 'Employees'],
    ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Bugsbon HRMS</div>

        <nav aria-label="Main">
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="who">
          <strong>{user.name}</strong>
          <span>{isSuper ? 'Super Admin' : 'Branch Sub Admin'}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}