import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // For demo purposes, we'll create a simple login system
    try {
      // Create new user for demo (simplified authentication)
      const userData = {
        name: email.split('@')[0],
        email: email,
        year_level: 11,
        subjects: ["Mathematics", "Physics", "Chemistry", "English", "History"]
      };
      const response = await axios.post(`${API}/users`, userData);
      const foundUser = response.data;
      
      setUser(foundUser);
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

const MainApp = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({});
  const [appLoading, setAppLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setAppLoading(true);
      const [tasksRes, activitiesRes, statsRes] = await Promise.all([
        axios.get(`${API}/users/${user.id}/tasks`),
        axios.get(`${API}/users/${user.id}/activities`),
        axios.get(`${API}/users/${user.id}/stats`)
      ]);
      
      setTasks(tasksRes.data);
      setActivities(activitiesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setAppLoading(false);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  const createTask = async (taskData) => {
    try {
      const response = await axios.post(`${API}/users/${user.id}/tasks`, taskData);
      setTasks([...tasks, response.data]);
      setShowTaskForm(false);
      await loadUserData();
      showNotification("✅ Task created and added to calendar!");
    } catch (error) {
      console.error("Error creating task:", error);
      showNotification("❌ Failed to create task. Please try again.");
    }
  };

  const createActivity = async (activityData) => {
    try {
      const response = await axios.post(`${API}/users/${user.id}/activities`, activityData);
      setActivities([...activities, response.data]);
      setShowActivityForm(false);
      await loadUserData();
      showNotification("✅ Activity created and added to calendar!");
    } catch (error) {
      console.error("Error creating activity:", error);
      showNotification("❌ Failed to create activity. Please try again.");
    }
  };

  const toggleTaskCompletion = async (taskId, completed) => {
    try {
      const response = await axios.put(`${API}/tasks/${taskId}`, { completed });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, completed } : task
      ));
      await loadUserData();
      showNotification(completed ? "✅ Task completed!" : "📝 Task marked as incomplete");
    } catch (error) {
      console.error("Error updating task:", error);
      showNotification("❌ Failed to update task status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (appLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        user={user}
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === "dashboard" && (
          <Dashboard 
            stats={stats} 
            tasks={tasks} 
            activities={activities}
            onCreateTask={() => setShowTaskForm(true)}
            onCreateActivity={() => setShowActivityForm(true)}
          />
        )}
        
        {currentView === "calendar" && (
          <CalendarView tasks={tasks} activities={activities} />
        )}

        {currentView === "weekly" && (
          <WeeklyView tasks={tasks} activities={activities} />
        )}
        
        {currentView === "tasks" && (
          <TasksView 
            tasks={tasks} 
            onToggleComplete={toggleTaskCompletion}
            onCreateTask={() => setShowTaskForm(true)}
          />
        )}
        
        {currentView === "activities" && (
          <ActivitiesView 
            activities={activities}
            onCreateActivity={() => setShowActivityForm(true)}
          />
        )}
      </main>

      {showTaskForm && (
        <TaskForm 
          subjects={user.subjects}
          onSubmit={createTask}
          onCancel={() => setShowTaskForm(false)}
        />
      )}

      {showActivityForm && (
        <ActivityForm 
          onSubmit={createActivity}
          onCancel={() => setShowActivityForm(false)}
        />
      )}

      {notification && (
        <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 max-w-sm">
          <p className="text-sm font-medium text-gray-900">{notification}</p>
        </div>
      )}
    </div>
  );
};

const LoginPage = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    yearLevel: 11
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(formData.email, formData.password);
    
    if (!result.success) {
      setError(result.error || "Login failed");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-600 mb-2">📅 StudyTime</h1>
          <h2 className="text-xl font-semibold text-gray-900">Student Time Management</h2>
          <p className="mt-2 text-gray-600">Organize your school life with ease</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-xl p-1 flex">
              <button
                onClick={() => setIsLogin(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isLogin ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !isLogin ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your full name"
                    required={!isLogin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                  <select
                    value={formData.yearLevel}
                    onChange={(e) => setFormData({...formData, yearLevel: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value={9}>Year 9</option>
                    <option value={10}>Year 10</option>
                    <option value={11}>Year 11</option>
                    <option value={12}>Year 12</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                {isLogin ? 'Sign up here' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Demo: Use any email to create/login to your account</p>
        </div>
      </div>
    </div>
  );
};

const Navigation = ({ currentView, setCurrentView, user }) => {
  const { logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-purple-600">
                📅 StudyTime
              </h1>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`nav-item ${currentView === "dashboard" ? "nav-item-active" : "nav-item-inactive"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView("calendar")}
                className={`nav-item ${currentView === "calendar" ? "nav-item-active" : "nav-item-inactive"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCurrentView("weekly")}
                className={`nav-item ${currentView === "weekly" ? "nav-item-active" : "nav-item-inactive"}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setCurrentView("tasks")}
                className={`nav-item ${currentView === "tasks" ? "nav-item-active" : "nav-item-inactive"}`}
              >
                Tasks
              </button>
              <button
                onClick={() => setCurrentView("activities")}
                className={`nav-item ${currentView === "activities" ? "nav-item-active" : "nav-item-inactive"}`}
              >
                Activities
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Welcome, {user.name} (Year {user.year_level})
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Dashboard = ({ stats, tasks, activities, onCreateTask, onCreateActivity }) => {
  const upcomingTasks = tasks
    .filter(task => !task.completed)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const upcomingActivities = activities
    .filter(activity => new Date(activity.start_datetime) > new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 5);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stats-card stats-card-total">
            <div className="text-white">
              <h3 className="text-lg font-semibold">Total Tasks</h3>
              <p className="text-3xl font-bold">{stats.total_tasks || 0}</p>
            </div>
          </div>
          <div className="stats-card stats-card-completed">
            <div className="text-white">
              <h3 className="text-lg font-semibold">Completed</h3>
              <p className="text-3xl font-bold">{stats.completed_tasks || 0}</p>
            </div>
          </div>
          <div className="stats-card stats-card-pending">
            <div className="text-white">
              <h3 className="text-lg font-semibold">Pending</h3>
              <p className="text-3xl font-bold">{stats.pending_tasks || 0}</p>
            </div>
          </div>
          <div className="stats-card stats-card-overdue">
            <div className="text-white">
              <h3 className="text-lg font-semibold">Overdue</h3>
              <p className="text-3xl font-bold">{stats.overdue_tasks || 0}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={onCreateTask}
            className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-2xl text-left transition-all duration-200 hover:shadow-lg hover:transform hover:-translate-y-1"
          >
            <div className="text-2xl mb-2">📚</div>
            <h3 className="text-xl font-semibold">Add School Task</h3>
            <p className="text-purple-100">Create assignments, tests, or projects</p>
          </button>
          
          <button
            onClick={onCreateActivity}
            className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-2xl text-left transition-all duration-200 hover:shadow-lg hover:transform hover:-translate-y-1"
          >
            <div className="text-2xl mb-2">🏃</div>
            <h3 className="text-xl font-semibold">Add Activity</h3>
            <p className="text-green-100">Schedule sports, clubs, or events</p>
          </button>
        </div>

        {/* Upcoming Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
            {upcomingTasks.length > 0 ? (
              <ul className="space-y-3">
                {upcomingTasks.map(task => (
                  <li key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        {task.subject} • Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'}
                    `}>
                      {task.priority}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming tasks</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Activities</h3>
            {upcomingActivities.length > 0 ? (
              <ul className="space-y-3">
                {upcomingActivities.map(activity => (
                  <li key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">
                        {activity.activity_type} • {new Date(activity.start_datetime).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {activity.activity_type}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming activities</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({ tasks, activities }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getItemsForDate = (date) => {
    if (!date) return [];
    
    // Create a date string for comparison (YYYY-MM-DD format)
    const targetDateStr = date.toISOString().split('T')[0];
    const items = [];
    
    // Add tasks - check due date
    tasks.forEach(task => {
      try {
        const taskDate = new Date(task.due_date);
        const taskDateStr = taskDate.toISOString().split('T')[0];
        if (taskDateStr === targetDateStr) {
          items.push({ ...task, type: 'task' });
        }
      } catch (error) {
        console.warn('Invalid task date:', task.due_date);
      }
    });
    
    // Add activities - check start date
    activities.forEach(activity => {
      try {
        const activityDate = new Date(activity.start_datetime);
        const activityDateStr = activityDate.toISOString().split('T')[0];
        if (activityDateStr === targetDateStr) {
          items.push({ ...activity, type: 'activity' });
        }
      } catch (error) {
        console.warn('Invalid activity date:', activity.start_datetime);
      }
    });
    
    return items;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Monthly Calendar</h2>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-sm text-gray-600">School Tasks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Activities</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              ←
            </button>
            <h3 className="text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const items = getItemsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-100 ${
                  date ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
              >
                {date && (
                  <>
                    <div className={`text-sm mb-1 ${isToday ? 'font-bold text-purple-600' : 'text-gray-700'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-1 rounded truncate ${
                            item.type === 'task' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{items.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const WeeklyView = ({ tasks, activities }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const getItemsForDate = (date) => {
    const targetDateStr = date.toISOString().split('T')[0];
    const items = [];
    
    // Add tasks
    tasks.forEach(task => {
      try {
        const taskDate = new Date(task.due_date);
        const taskDateStr = taskDate.toISOString().split('T')[0];
        if (taskDateStr === targetDateStr) {
          items.push({ ...task, type: 'task' });
        }
      } catch (error) {
        console.warn('Invalid task date:', task.due_date);
      }
    });
    
    // Add activities
    activities.forEach(activity => {
      try {
        const activityDate = new Date(activity.start_datetime);
        const activityDateStr = activityDate.toISOString().split('T')[0];
        if (activityDateStr === targetDateStr) {
          items.push({ ...activity, type: 'activity', time: activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
        }
      } catch (error) {
        console.warn('Invalid activity date:', activity.start_datetime);
      }
    });
    
    return items.sort((a, b) => {
      if (a.type === 'activity' && b.type === 'activity') {
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      }
      return 0;
    });
  };

  const weekDays = getWeekDays(currentDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Weekly Timetable</h2>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-sm text-gray-600">School Tasks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Activities</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() - 7);
                setCurrentDate(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              ← Previous Week
            </button>
            <h3 className="text-lg font-semibold">
              {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
            </h3>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + 7);
                setCurrentDate(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              Next Week →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((date, index) => {
            const items = getItemsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            
            return (
              <div
                key={index}
                className={`bg-gray-50 rounded-xl p-4 min-h-[400px] ${
                  isToday ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                }`}
              >
                <div className="text-center mb-4">
                  <h4 className={`font-semibold ${isToday ? 'text-purple-700' : 'text-gray-700'}`}>
                    {dayNames[index]}
                  </h4>
                  <p className={`text-lg font-bold ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-sm ${
                        item.type === 'task' 
                          ? 'bg-purple-100 text-purple-800 border-l-4 border-purple-500' 
                          : 'bg-green-100 text-green-800 border-l-4 border-green-500'
                      }`}
                    >
                      <div className="font-medium">{item.title}</div>
                      {item.type === 'activity' && item.time && (
                        <div className="text-xs mt-1">{item.time}</div>
                      )}
                      {item.type === 'task' && item.priority && (
                        <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                          item.priority === 'high' ? 'bg-red-200 text-red-800' :
                          item.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {item.priority} priority
                        </div>
                      )}
                      {item.subject && (
                        <div className="text-xs text-gray-600 mt-1">{item.subject}</div>
                      )}
                    </div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      No items scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TasksView = ({ tasks, onToggleComplete, onCreateTask }) => {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_date");

  const filteredTasks = tasks.filter(task => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    if (filter === "overdue") {
      return !task.completed && new Date(task.due_date) < new Date();
    }
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "due_date") {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Tasks</h2>
          <button
            onClick={onCreateTask}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            + Add Task
          </button>
        </div>

        <div className="flex space-x-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>

        <div className="space-y-4">
          {sortedTasks.map(task => (
            <div key={task.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => onToggleComplete(task.id, e.target.checked)}
                      className="h-6 w-6 text-purple-600 rounded border-2 border-gray-300 focus:ring-purple-500 focus:ring-2"
                    />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {task.subject} • {task.task_type} • Due: {new Date(task.due_date).toLocaleString()}
                    </p>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'}
                  `}>
                    {task.priority}
                  </span>
                  {new Date(task.due_date) < new Date() && !task.completed && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {sortedTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No tasks found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActivitiesView = ({ activities, onCreateActivity }) => {
  const [filter, setFilter] = useState("all");

  const filteredActivities = activities.filter(activity => {
    if (filter === "upcoming") {
      return new Date(activity.start_datetime) > new Date();
    }
    if (filter === "past") {
      return new Date(activity.end_datetime) < new Date();
    }
    if (filter !== "all") {
      return activity.activity_type === filter;
    }
    return true;
  });

  const sortedActivities = [...filteredActivities].sort((a, b) => 
    new Date(a.start_datetime) - new Date(b.start_datetime)
  );

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Activities</h2>
          <button
            onClick={onCreateActivity}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            + Add Activity
          </button>
        </div>

        <div className="mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2"
          >
            <option value="all">All Activities</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="sports">Sports</option>
            <option value="club">Club</option>
            <option value="meeting">Meeting</option>
            <option value="practice">Practice</option>
            <option value="competition">Competition</option>
            <option value="event">Event</option>
          </select>
        </div>

        <div className="space-y-4">
          {sortedActivities.map(activity => (
            <div key={activity.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(activity.start_datetime).toLocaleString()} - {new Date(activity.end_datetime).toLocaleString()}
                  </p>
                  {activity.location && (
                    <p className="text-sm text-gray-500">📍 {activity.location}</p>
                  )}
                  {activity.description && (
                    <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {activity.activity_type}
                  </span>
                  {new Date(activity.start_datetime) > new Date() && (
                    <div className="text-xs text-green-600 mt-1">Upcoming</div>
                  )}
                  {new Date(activity.end_datetime) < new Date() && (
                    <div className="text-xs text-gray-500 mt-1">Completed</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {sortedActivities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No activities found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TaskForm = ({ subjects, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: subjects[0] || "",
    task_type: "assignment",
    priority: "medium",
    due_date: "",
    due_time: "",
    estimated_duration: "",
    color: "#6366f1"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      due_date: new Date(formData.due_date + "T" + (formData.due_time || "23:59")).toISOString(),
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null
    };
    delete submitData.due_time;
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Create New Task</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              required
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.task_type}
              onChange={(e) => setFormData({...formData, task_type: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            >
              <option value="assignment">Assignment</option>
              <option value="test">Test</option>
              <option value="project">Project</option>
              <option value="homework">Homework</option>
              <option value="study">Study</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
              <input
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData({...formData, due_time: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ActivityForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    activity_type: "sports",
    start_datetime: "",
    end_datetime: "",
    location: "",
    color: "#10b981"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: new Date(formData.end_datetime).toISOString()
    };
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Create New Activity</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.activity_type}
              onChange={(e) => setFormData({...formData, activity_type: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            >
              <option value="sports">Sports</option>
              <option value="club">Club</option>
              <option value="meeting">Meeting</option>
              <option value="practice">Practice</option>
              <option value="competition">Competition</option>
              <option value="event">Event</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
            <input
              type="datetime-local"
              value={formData.start_datetime}
              onChange={(e) => setFormData({...formData, start_datetime: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
            <input
              type="datetime-local"
              value={formData.end_datetime}
              onChange={(e) => setFormData({...formData, end_datetime: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              placeholder="Where is this activity?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Create Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
