import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useManage } from '../useManage.js';
import { Loading, Notice, PageHeader } from '../components/ui.jsx';

export default function Dashboard() {
  const { user, isSuper } = useAuth();

  const { data, loadError } = useManage(async () => {
    const [branches, departments, designations, users] = await Promise.all([
      api.get('/branches'),
      api.get('/departments'),
      api.get('/designations'),
      api.get('/users'),
    ]);

    return { branches, departments, designations, users };
  });

  if (loadError) return <Notice notice={{ type: 'error', text: loadError }} />;
  if (!data) return <Loading />;

  const { branches, departments, designations, users } = data;

  const activeCount = (list, key = 'status') =>
    list.filter((x) => (key === 'status' ? x.status === 'active' : x[key])).length;

  // Super Admin: branches + employee overview only.
  // Sub Admin: department, designation and employee overview.
  const stats = isSuper
    ? [
        {
          label: 'Branches',
          icon: '🏢',
          total: branches.length,
          active: activeCount(branches),
          to: '/branches',
        },
        {
          label: 'Employees',
          icon: '👥',
          total: users.length,
          active: activeCount(users, 'is_active'),
          to: '/employees',
        },
      ]
    : [
        {
          label: 'Departments',
          icon: '🗂️',
          total: departments.length,
          active: activeCount(departments),
          to: '/departments',
        },
        {
          label: 'Designations',
          icon: '🏷️',
          total: designations.length,
          active: activeCount(designations),
          to: '/designations',
        },
        {
          label: 'Employees',
          icon: '👥',
          total: users.length,
          active: activeCount(users, 'is_active'),
          to: '/employees',
        },
      ];

  const superAdminActions = [
    {
      label: 'Manage Branches',
      desc: 'View branch details and create a new branch.',
      icon: '🏢',
      to: '/branches',
      tone: 'blue',
    },
    {
      label: 'View Employees',
      desc: 'View employee records across your branches.',
      icon: '👥',
      to: '/employees',
      tone: 'green',
    },
  ];

  const subAdminActions = [
    {
      label: 'Create Department',
      desc: 'Add a department to your branch.',
      icon: '➕',
      to: '/departments',
      tone: 'blue',
    },
    {
      label: 'Add Employee',
      desc: 'Add an employee and assign department and designation.',
      icon: '👤',
      to: '/employees',
      tone: 'green',
    },
    {
      label: 'Manage Designations',
      desc: 'Manage job titles in your departments.',
      icon: '🏷️',
      to: '/designations',
      tone: 'purple',
    },
  ];

  const actions = isSuper ? superAdminActions : subAdminActions;

  return (
    <div className="dashboard">
      <PageHeader
        title={`Welcome, ${user.name} 👋`}
        subtitle={
          isSuper
            ? 'Manage branches and view employee records across the organization.'
            : `You manage ${branches[0]?.branch_name || 'your branch'}.`
        }
      />

      <section className="stat-grid">
        {stats.map((stat) => (
          <Link to={stat.to} key={stat.label} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-body">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{stat.total}</span>
              <span className="stat-meta">{stat.active} active</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="action-section">
        <h2 className="section-title">Quick Actions</h2>

        <div className="action-grid">
          {actions.map((action) => (
            <Link
              to={action.to}
              key={action.label}
              className={`action-card tone-${action.tone}`}
            >
              <div className="action-icon">{action.icon}</div>
              <h3>{action.label}</h3>
              <p>{action.desc}</p>
              <span className="action-cta">Get started →</span>
            </Link>
          ))}
        </div>
      </section>

      {isSuper ? (
        <section className="card next-step">
          <h2>Next step</h2>
          <p>
            {branches.length
              ? 'Manage your branches or review employee records.'
              : (
                <>
                  Start by <Link to="/branches">creating a branch</Link> and assigning its Sub Admin.
                </>
              )}
          </p>
        </section>
      ) : (
        <section className="card setup-card">
          <h2>Set up your branch</h2>
          <ol className="steps">
            <li className={departments.length ? 'done' : ''}>
              <Link to="/departments">Create departments</Link> such as Development, Testing or Sales.
            </li>
            <li className={designations.length ? 'done' : ''}>
              <Link to="/designations">Add designations</Link> inside each department.
            </li>
            <li className={users.length > 1 ? 'done' : ''}>
              <Link to="/employees">Add employees</Link> and assign their department and designation.
            </li>
          </ol>
        </section>
      )}
    </div>
  );
}