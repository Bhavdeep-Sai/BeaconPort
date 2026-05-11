import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import School from './School/School'
import AttendanceStudentList from './School/components/Attendance/AttendanceStudentList'
import Class from './School/components/Class/Class'
import Subjects from './School/components/Subjects/Subjects'
import Students from './School/components/Students/Students'
import Teachers from './School/components/Teachers/Teachers'
import Dashboard from './School/components/Dashboard/Dashboard'
import Notice from './School/components/Notice/Notice'
import Schedule from './School/components/Schedule/Schedule'
import Examination from './School/components/Examination/Examination'
import Client from './Client/Client'
import Home from './Client/components/Home/Home'
import Login from './Client/components/Login/Login'
import Register from './Client/components/Register/Register'
import ResetPassword from './Client/components/Login/ResetPassword'

// Teacher Router
import Teacher from './Teacher/Teacher'
import TeacherDashboard from './Teacher/components/Dashboard/Dashboard'
import TeacherAttendance from './Teacher/components/Attendance/Attendance'
import TeacherSchedule from './Teacher/components/Schedule/Schedule'
import TeacherExamination from './Teacher/components/Examination/Examination'
import TeacherNotice from './Teacher/components/Notice/Notice'
import TeacherPayment from './Teacher/components/Payment/Payment'

// Student Router
import Student from './Student/Student'
import StudentDashboard from './Student/Components/Dashboard/Dashboard'
import StudentAttendance from './Student/Components/Attendance/Attendance'
import StudentSchedule from './Student/Components/Schedule/Schedule'
import StudentExamination from './Student/Components/Examination/Examination'
import StudentNotice from './Student/Components/Notice/Notice'
import ProtectedRoute from './Guard/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import AttendanceDetails from './School/components/Attendance/AttendanceDetails'
import Fee from './School/components/Fee/Fee'
import Salary from './School/components/Salary/Salary'
import Logout from './Client/components/Logout/Logout'
import RoleSelection from './Client/components/RoleSelection/RoleSelection'
import ChatBot from './Student/Components/ChatBot/ChatBot'

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Home Route */}
          <Route path='/' element={<Client />}>
            <Route index element={<Home />} />
          </Route>

          {/* Authentication Routes - These are standalone, not nested */}
          <Route path='/select-role' element={<RoleSelection />} />
          <Route path='/login/:role' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/logout' element={<Logout />} />
          
          {/* Password Reset Route - Must be standalone */}
          <Route path='/reset-password/:token' element={<ResetPassword />} />

          {/* Legacy login route (for backward compatibility) */}
          <Route path='/login' element={<RoleSelection />} />

          {/* School Routes */}
          <Route path='/school' element={<ProtectedRoute allowedRoles={['SCHOOL']}><School /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path='dashboard' element={<Dashboard />} />
            <Route path='attendance' element={<AttendanceStudentList />} />
            <Route path='attendance/:id' element={<AttendanceDetails />} />
            <Route path='class' element={<Class />} />
            <Route path='subject' element={<Subjects />} />
            <Route path='student' element={<Students />} />
            <Route path='teacher' element={<Teachers />} />
            <Route path='notice' element={<Notice />} />
            <Route path='schedule' element={<Schedule />} />
            <Route path='examination' element={<Examination />} />
            <Route path='fee' element={<Fee />} />
            <Route path='salary' element={<Salary />} />
          </Route>

          {/* Student Routes */}
          <Route path='/student' element={<ProtectedRoute allowedRoles={['STUDENT']}><Student /></ProtectedRoute>}>
            <Route index element={<StudentDashboard />} />
            <Route path='dashboard' element={<StudentDashboard />} />
            <Route path='schedule' element={<StudentSchedule />} />
            <Route path='attendance/:id' element={<StudentAttendance />} />
            <Route path='examination' element={<StudentExamination />} />
            <Route path='notice' element={<StudentNotice />} />
          </Route>
            <Route path='chatbot' element={<ChatBot />} />

          {/* Teacher Routes */}
          <Route path='/teacher' element={<ProtectedRoute allowedRoles={['TEACHER']}><Teacher /></ProtectedRoute>}>
            <Route index element={<TeacherDashboard />} />
            <Route path='dashboard' element={<TeacherDashboard />} />
            <Route path='schedule' element={<TeacherSchedule />} />
            <Route path='attendance' element={<TeacherAttendance />} />
            <Route path='examination' element={<TeacherExamination />} />
            <Route path='notice' element={<TeacherNotice />} />
            <Route path='payments' element={<TeacherPayment />} />
          </Route>

          {/* Catch-all route for 404 - Optional */}
          <Route path='*' element={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">404 - Page Not Found</h1>
                <p className="text-gray-300 mb-4">The page you're looking for doesn't exist.</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded"
                >
                  Go Home
                </button>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App