import React from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Users, GraduationCap, ArrowLeft } from 'lucide-react';

const roles = [
  {
    id: 'school',
    title: 'School Admin',
    description: 'Manage your entire institution from one powerful dashboard.',
    gradient: 'from-orange-500 to-red-600',
    hoverGlow: 'hover:shadow-orange-500/20',
    borderHover: 'hover:border-orange-500/40',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-400',
    btnGradient: 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
    dotColor: 'bg-orange-500',
    icon: <School className="w-8 h-8 text-white" />,
    iconBg: 'bg-gradient-to-br from-orange-500 to-red-600',
    features: ['Student & Teacher Management', 'Class & Subject Setup', 'Attendance Tracking', 'Examination Management'],
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Access your teaching dashboard to manage classes and track progress.',
    gradient: 'from-blue-500 to-indigo-600',
    hoverGlow: 'hover:shadow-blue-500/20',
    borderHover: 'hover:border-blue-500/40',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    btnGradient: 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    dotColor: 'bg-blue-400',
    icon: <Users className="w-8 h-8 text-white" />,
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    features: ['Weekly Schedule View', 'Mark Attendance', 'Grade Examinations', 'School Notices'],
  },
  {
    id: 'student',
    title: 'Student',
    description: 'Access your classes, attendance records, and stay up to date.',
    gradient: 'from-green-600 to-green-800',
    hoverGlow: 'hover:shadow-green-600/20',
    borderHover: 'hover:border-green-600/40',
    badgeBg: 'bg-green-600/15',
    badgeText: 'text-green-400',
    btnGradient: 'from-green-600 to-green-600 hover:from-green-800 hover:to-green-800',
    dotColor: 'bg-green-400',
    icon: <GraduationCap className="w-8 h-8 text-white" />,
    iconBg: 'bg-gradient-to-br from-green-600 to-green-800',
    features: ['View Timetable', 'Attendance Records', 'Exam Schedules & Results', 'AI Tutor Assistant'],
  },
];

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-hidden bg-gray-900 flex flex-col">

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/bell.svg" alt="BeaconPort" className="w-8 h-8 brightness-0 invert" />
          <span className="text-xl font-bold text-white tracking-wide">BeaconPort</span>
        </div>
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-400 transition-colors cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Home</span>
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10">

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-3">Choose Your Role</h1>
            <p className="text-gray-400 text-base max-w-xl mx-auto">
              Select the portal that matches your role to access the right tools and dashboard.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => navigate(`/login/${role.id}`)}
                className={`group relative bg-gray-800 border border-gray-700 ${role.borderHover} rounded-2xl p-7 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${role.hoverGlow} overflow-hidden`}
              >
                {/* Subtle gradient wash on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 rounded-2xl pointer-events-none`} />

                {/* Decorative orb */}
                <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${role.gradient} opacity-10 rounded-full group-hover:opacity-20 transition-opacity duration-300 pointer-events-none`} />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl ${role.iconBg} flex items-center justify-center mb-5 shadow-lg`}>
                    {role.icon}
                  </div>

                  {/* Badge */}
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${role.badgeBg} ${role.badgeText}`}>
                    {role.title}
                  </span>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{role.description}</p>

                  {/* Features */}
                  <ul className="space-y-2 mb-7">
                    {role.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${role.dotColor}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${role.btnGradient} transition-all duration-200 shadow-md cursor-pointer border-none`}
                  >
                    Sign in as {role.title}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Register link */}
          <p className="text-center text-gray-500 text-sm mt-10">
            New school?{' '}
            <span
              onClick={() => navigate('/register')}
              className="text-orange-400 hover:text-orange-300 cursor-pointer font-medium underline underline-offset-4 transition-colors"
            >
              Create an account
            </span>
          </p>

        </div>
      </div>

      {/* Background glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default RoleSelection;