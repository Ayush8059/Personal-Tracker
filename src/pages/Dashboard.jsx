import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { handleTiltMove, handleTiltLeave, triggerCheckConfetti } from '../utils/effects';
import ParticleBackground from '../components/ParticleBackground';
import TrendChart from '../components/TrendChart';
import WeeklyReports from '../components/WeeklyReports';
import { 
  LogOut, Plus, Trash2, RotateCcw, Bell, BellOff, 
  HelpCircle, BarChart3, AlertTriangle, ShieldCheck, Check,
  Sun, Moon, CheckSquare, ChevronUp, ChevronDown
} from 'lucide-react';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const DEFAULT_HABITS = [
  { id: "h1", name: "Wake up at 05:00", emoji: "⚡", color: "var(--cyan-accent)" },
  { id: "h2", name: "Gym Workout", emoji: "🏋️", color: "var(--green-accent)" },
  { id: "h3", name: "Reading / Learning", emoji: "📖", color: "var(--purple-accent)" },
  { id: "h4", name: "Day Planning", emoji: "🧘", color: "var(--amber-accent)" },
  { id: "h5", name: "Budget Tracking", emoji: "💰", color: "var(--cyan-accent)" },
  { id: "h6", name: "Project Work", emoji: "💻", color: "var(--purple-accent)" },
  { id: "h7", name: "No Alcohol", emoji: "🍷", color: "var(--rose-accent)" },
  { id: "h8", name: "Social Media Detox", emoji: "📱", color: "var(--rose-accent)" },
  { id: "h9", name: "Goal Journaling", emoji: "✍️", color: "var(--amber-accent)" },
  { id: "h10", name: "Cold Shower", emoji: "🚿", color: "var(--cyan-accent)" }
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [habits, setHabits] = useState([]);
  const [history, setHistory] = useState({}); // { dateStr: { habitId: true } }
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [activeYear] = useState(new Date().getFullYear());
  const [activeViewTab, setActiveViewTab] = useState('grid'); // 'grid', 'reports', 'manual'
  
  // Custom states
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('⚡');
  const [newHabitColor, setNewHabitColor] = useState('var(--cyan-accent)');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [streakRescueAlert, setStreakRescueAlert] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('aethertrack_theme') || 'dark');
  const [loading, setLoading] = useState(true);

  const headerRef = useRef(null);
  const sidebarRef = useRef(null);
  const gridRef = useRef(null);
  const spreadsheetRef = useRef(null);
  const navigate = useNavigate();

  /* ==========================================================================
     AUTHENTICATION CHECK
     ========================================================================== */
  useEffect(() => {
    async function checkAuth() {
      const guestSession = localStorage.getItem('aethertrack_guest_session');
      if (guestSession) {
        const session = JSON.parse(guestSession);
        setUser(session.user);
        setIsGuest(true);
        loadLocalData();
        setLoading(false);
      } else {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser) {
          setUser(supabaseUser);
          setIsGuest(false);
          await loadSupabaseData(supabaseUser.id);
          setLoading(false);
        } else {
          navigate('/login');
        }
      }
    }
    checkAuth();
  }, [navigate]);

  // Theme Sync Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aethertrack_theme', theme);
  }, [theme]);

  // Drag-to-Scroll Calendar Grid
  useEffect(() => {
    const el = spreadsheetRef.current;
    if (!el) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (target.closest('button') || target.closest('.custom-checkbox') || target.closest('.reorder-btns')) return;
      
      isDown = true;
      el.classList.add('grabbing');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      el.classList.remove('grabbing');
    };

    const handleMouseUp = () => {
      isDown = false;
      el.classList.remove('grabbing');
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loading, activeViewTab]);

  /* ==========================================================================
     DATA LOADERS (Local Storage vs Supabase)
     ========================================================================== */
  const loadLocalData = () => {
    const savedHabits = localStorage.getItem('aethertrack_local_habits');
    const savedHistory = localStorage.getItem('aethertrack_local_history');
    
    if (savedHabits) {
      setHabits(JSON.parse(savedHabits));
    } else {
      setHabits(DEFAULT_HABITS);
      localStorage.setItem('aethertrack_local_habits', JSON.stringify(DEFAULT_HABITS));
    }

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    } else {
      setHistory({});
    }

    const reminderVal = localStorage.getItem('aethertrack_reminders_enabled');
    setRemindersEnabled(reminderVal === 'true');
  };

  const loadSupabaseData = async (userId) => {
    try {
      // 1. Fetch habits
      const { data: dbHabits, error: habitsErr } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true });

      if (habitsErr) throw habitsErr;

      // Seed default habits if user is fresh and has no database entries
      const hasSeeded = localStorage.getItem('aethertrack_seeded_' + userId);
      if ((!dbHabits || dbHabits.length === 0) && !hasSeeded) {
        const seeded = [];
        for (const defaultHabit of DEFAULT_HABITS) {
          const { data, error: insertErr } = await supabase
            .from('habits')
            .insert({
              user_id: userId,
              name: defaultHabit.name,
              emoji: defaultHabit.emoji,
              color: defaultHabit.color
            })
            .select();
          if (insertErr) throw insertErr;
          if (data && data[0]) seeded.push(data[0]);
        }
        localStorage.setItem('aethertrack_seeded_' + userId, 'true');
        setHabits(seeded);
      } else {
        setHabits(dbHabits || []);
      }

      // 2. Fetch history
      const { data: dbHistory, error: historyErr } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId);

      if (historyErr) throw historyErr;

      const historyMap = {};
      if (dbHistory) {
        dbHistory.forEach(row => {
          const dateStr = row.date; // "YYYY-MM-DD"
          if (!historyMap[dateStr]) historyMap[dateStr] = {};
          historyMap[dateStr][row.habit_id] = row.checked;
        });
      }
      setHistory(historyMap);

      const reminderVal = localStorage.getItem('aethertrack_reminders_enabled');
      setRemindersEnabled(reminderVal === 'true');
    } catch (err) {
      console.error('Error loading Supabase data:', err);
    }
  };

  /* ==========================================================================
     STREAK RESCUE CHECK
     ========================================================================== */
  useEffect(() => {
    // Check if today has at least 1 checked habit.
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const todayLogs = history[dateStr];
    const hasChecks = todayLogs && Object.values(todayLogs).some(v => v === true);
    
    // Alert if it is late (e.g. past 12 PM) and user has no habits checked off yet
    if (habits.length > 0 && !hasChecks) {
      setStreakRescueAlert(true);
    } else {
      setStreakRescueAlert(false);
    }
  }, [history, habits]);

  /* ==========================================================================
     HABIT LOGIC
     ========================================================================== */
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    if (isGuest) {
      const newHabit = {
        id: 'h_' + Date.now(),
        name: newHabitName.trim(),
        emoji: newHabitEmoji,
        color: newHabitColor
      };
      const updated = [...habits, newHabit];
      setHabits(updated);
      localStorage.setItem('aethertrack_local_habits', JSON.stringify(updated));
    } else {
      try {
        const { data, error } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            name: newHabitName.trim(),
            emoji: newHabitEmoji,
            color: newHabitColor
          })
          .select();
        
        if (error) throw error;
        if (data && data[0]) {
          setHabits([...habits, data[0]]);
        }
      } catch (err) {
        alert('Failed to save habit: ' + err.message);
      }
    }

    setNewHabitName('');
  };

  const handleDeleteHabit = async (id) => {
    if (!confirm('Are you sure you want to delete this habit and all its history?')) return;

    if (isGuest) {
      const updated = habits.filter(h => h.id !== id);
      setHabits(updated);
      localStorage.setItem('aethertrack_local_habits', JSON.stringify(updated));
      
      // Clean local history
      const cleanedHistory = { ...history };
      Object.keys(cleanedHistory).forEach(date => {
        if (cleanedHistory[date][id]) delete cleanedHistory[date][id];
      });
      setHistory(cleanedHistory);
      localStorage.setItem('aethertrack_local_history', JSON.stringify(cleanedHistory));
    } else {
      try {
        const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setHabits(habits.filter(h => h.id !== id));
        
        // Refresh local history copy
        const cleanedHistory = { ...history };
        Object.keys(cleanedHistory).forEach(date => {
          if (cleanedHistory[date][id]) delete cleanedHistory[date][id];
        });
        setHistory(cleanedHistory);
      } catch (err) {
        alert('Failed to delete habit: ' + err.message);
      }
    }
  };

  /* ==========================================================================
     CHECKBOX CLICK LOGIC
     ========================================================================== */
  const handleCheckboxToggle = async (e, habitId, dayNum) => {
    const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const wasChecked = !!(history[dateStr] && history[dateStr][habitId]);
    
    // Client Confetti Effect on Checking
    if (!wasChecked) {
      const habit = habits.find(h => h.id === habitId);
      triggerCheckConfetti(e.clientX, e.clientY, habit?.color || '#00e5ff');
    }

    if (isGuest) {
      const newHistory = {
        ...history,
        [dateStr]: {
          ...(history[dateStr] || {}),
          [habitId]: !wasChecked
        }
      };
      setHistory(newHistory);
      localStorage.setItem('aethertrack_local_history', JSON.stringify(newHistory));
    } else {
      try {
        if (!wasChecked) {
          // INSERT / UPSERT log
          const { error } = await supabase
            .from('history')
            .upsert({
              user_id: user.id,
              habit_id: habitId,
              date: dateStr,
              checked: true
            }, { onConflict: 'user_id,habit_id,date' });
          if (error) throw error;
        } else {
          // DELETE log
          const { error } = await supabase
            .from('history')
            .delete()
            .eq('user_id', user.id)
            .eq('habit_id', habitId)
            .eq('date', dateStr);
          if (error) throw error;
        }
        
        // Update local state
        setHistory({
          ...history,
          [dateStr]: {
            ...(history[dateStr] || {}),
            [habitId]: !wasChecked
          }
        });
      } catch (err) {
        console.error('Error toggling database log:', err);
      }
    }
  };

  /* ==========================================================================
     RESET ACTION (The Reset Button)
     ========================================================================== */
  const handleResetActiveMonth = async () => {
    const monthName = MONTH_NAMES[activeMonth];
    if (!confirm(`Warning: This will clear all habit logs for ${monthName} ${activeYear}. This action is permanent. Do you wish to continue?`)) return;

    const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    const targetDates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      targetDates.push(`${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }

    if (isGuest) {
      const updatedHistory = { ...history };
      targetDates.forEach(date => {
        if (updatedHistory[date]) delete updatedHistory[date];
      });
      setHistory(updatedHistory);
      localStorage.setItem('aethertrack_local_history', JSON.stringify(updatedHistory));
    } else {
      try {
        // Delete history logs for target dates in database
        for (const dateStr of targetDates) {
          const { error } = await supabase
            .from('history')
            .delete()
            .eq('user_id', user.id)
            .eq('date', dateStr);
          if (error) throw error;
        }
        
        // Clean local state
        const updatedHistory = { ...history };
        targetDates.forEach(date => {
          if (updatedHistory[date]) delete updatedHistory[date];
        });
        setHistory(updatedHistory);
      } catch (err) {
        alert('Reset failed: ' + err.message);
      }
    }
  };

  const handleClearAllHabits = async () => {
    const confirmWipe = window.confirm(
      "Are you sure you want to WIPE all habits? This will delete all of your current habits and checkboxes so you can start fresh."
    );
    if (!confirmWipe) return;

    if (isGuest) {
      setHabits([]);
      localStorage.setItem('aethertrack_local_habits', JSON.stringify([]));
      setHistory({});
      localStorage.setItem('aethertrack_local_history', JSON.stringify({}));
      alert('Local workspace habit list wiped successfully!');
    } else {
      try {
        setLoading(true);
        // 1. Delete history logs in Database
        const { error: histErr } = await supabase
          .from('history')
          .delete()
          .eq('user_id', user.id);
        if (histErr) throw histErr;

        // 2. Delete all habits in Database
        const { error: habErr } = await supabase
          .from('habits')
          .delete()
          .eq('user_id', user.id);
        if (habErr) throw habErr;

        // 3. Mark as manually seeded/wiped to prevent default loading
        localStorage.setItem('aethertrack_seeded_' + user.id, 'true');

        // 4. Update states
        setHabits([]);
        setHistory({});
        alert('Cloud workspace habit list wiped successfully!');
      } catch (err) {
        alert('Failed to clear habits: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReorderHabit = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= habits.length) return;

    const updated = [...habits];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setHabits(updated);

    if (isGuest) {
      localStorage.setItem('aethertrack_local_habits', JSON.stringify(updated));
    } else {
      try {
        const habitA = updated[index];
        const habitB = updated[targetIndex];

        // Swap created_at timestamps in database to persist ordering
        const { error: errA } = await supabase
          .from('habits')
          .update({ created_at: habitB.created_at })
          .eq('id', habitA.id);
        if (errA) throw errA;

        const { error: errB } = await supabase
          .from('habits')
          .update({ created_at: habitA.created_at })
          .eq('id', habitB.id);
        if (errB) throw errB;

        // Sync local object values
        const tempTime = habitA.created_at;
        habitA.created_at = habitB.created_at;
        habitB.created_at = tempTime;
      } catch (err) {
        console.error('Failed to sync reorder with database:', err);
      }
    }
  };

  /* ==========================================================================
     REMINDERS CONFIG
     ========================================================================== */
  const handleReminderToggle = async () => {
    const nextState = !remindersEnabled;
    
    if (nextState) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setRemindersEnabled(true);
        localStorage.setItem('aethertrack_reminders_enabled', 'true');
        
        // Trigger verification notification
        new Notification("AetherTrack Reminders Active!", {
          body: "We will notify you in the evening if you have incomplete habits.",
          icon: "https://placeholder-url.supabase.co/logo.png"
        });
      } else {
        alert('Notification permission was blocked. Please enable it in browser site settings.');
        setRemindersEnabled(false);
        localStorage.setItem('aethertrack_reminders_enabled', 'false');
      }
    } else {
      setRemindersEnabled(false);
      localStorage.setItem('aethertrack_reminders_enabled', 'false');
    }
  };

  /* ==========================================================================
     LOGOUT ACTION
     ========================================================================== */
  const handleLogout = async () => {
    if (isGuest) {
      localStorage.removeItem('aethertrack_guest_session');
    } else {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  /* ==========================================================================
     CALCULATORS & DATE HELPERS
     ========================================================================== */
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const getDaysArray = useCallback(() => {
    const daysArr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(activeYear, activeMonth, d);
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 2);
      daysArr.push({ dayNum: d, dayName: dayName });
    }
    return daysArr;
  }, [activeMonth, activeYear, daysInMonth]);

  const daysArr = getDaysArray();

  // Weekly structure boundaries
  const getWeeksHeaders = () => {
    const w1Span = 7;
    const w2Span = 7;
    const w3Span = 7;
    const w4Span = daysInMonth - 21; // spans remaining days of the month (e.g. 7 to 10 days)
    return [
      { key: 'w-1', title: 'Week 1', span: w1Span },
      { key: 'w-2', title: 'Week 2', span: w2Span },
      { key: 'w-3', title: 'Week 3', span: w3Span },
      { key: 'w-4', title: 'Week 4', span: w4Span }
    ];
  };

  // Metrics card calculations
  const calculateMetrics = () => {
    let totalChecked = 0;
    let totalPossible = daysInMonth * habits.length;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      habits.forEach(habit => {
        if (history[dateStr] && history[dateStr][habit.id]) {
          totalChecked++;
        }
      });
    }

    const rate = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;
    return { completionRate: rate, totalDone: totalChecked, possibleCount: totalPossible };
  };

  const metrics = calculateMetrics();

  // Color interpolation for progress rows
  const getProgressColor = (rate) => {
    const hue = (rate / 100) * 120; // 0 red, 120 green
    return `hsl(${hue}, 85%, 45%)`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--cyan-accent)', fontFamily: 'Outfit', fontSize: '1.2rem' }}>Initializing AetherSpace...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <ParticleBackground />

      <div className="app-container">
        {/* Upper Header panel */}
        <header 
          className="app-header glass-card tilt-effect"
          ref={headerRef}
          onMouseMove={(e) => handleTiltMove(e, headerRef.current, 1)}
          onMouseLeave={() => handleTiltLeave(headerRef.current)}
        >
          <div className="brand">
            <div className="brand-logo">
              <i className="fa-solid fa-cubes-three-d glowing-icon"></i>
            </div>
            <div className="brand-text">
              <h1>AetherTrack</h1>
              <p>3D React Life Space {isGuest && <span className="year-badge">Guest Mode</span>}</p>
            </div>
          </div>

          <div className="header-right">
            <div className="header-metrics">
              <div className="metric-card">
                <div className="metric-info">
                  <span className="metric-label">Month Progress</span>
                  <span className="metric-value">{metrics.completionRate}%</span>
                </div>
                <div className="metric-visual">
                  <svg className="progress-ring" width="46" height="46">
                    <circle className="progress-ring__circle-bg" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" fill="transparent" r="18" cx="23" cy="23"/>
                    <circle 
                      className="progress-ring__circle" 
                      stroke="var(--cyan-accent)" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      fill="transparent" 
                      r="18" 
                      cx="23" 
                      cy="23"
                      style={{
                        strokeDasharray: `${2*Math.PI*18} ${2*Math.PI*18}`,
                        strokeDashoffset: 2*Math.PI*18 - (metrics.completionRate / 100) * 2*Math.PI*18
                      }}
                    />
                  </svg>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-info">
                  <span className="metric-label">Completed Logs</span>
                  <span className="metric-value">{metrics.totalDone}</span>
                </div>
                <div className="metric-visual-icon purple">
                  <ShieldCheck size={16} />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="nav-arrow-btn"
              style={{ borderRadius: '50%', width: '36px', height: '36px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun size={15} style={{ color: 'var(--amber-accent)' }} /> : <Moon size={15} style={{ color: 'var(--purple-accent)' }} />}
            </button>

            <div className="user-profile-badge">
              <span className="user-email">{user?.email}</span>
              <button onClick={handleLogout} className="logout-btn" title="Logout session">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Streak Rescue In-App Warning */}
        {streakRescueAlert && activeMonth === new Date().getMonth() && (
          <div className="streak-rescue-alert">
            <div className="alert-icon-wrap">
              <AlertTriangle size={16} />
            </div>
            <div className="alert-message">
              <h5>Streak Rescue Alert!</h5>
              <p>You have not logged any habits today. Protect your consistency streak by tracking your routines.</p>
            </div>
          </div>
        )}

        {/* Dashboard grid panel */}
        <main className="main-content">
          <aside 
            className="sidebar-panel glass-card tilt-effect"
            ref={sidebarRef}
            onMouseMove={(e) => handleTiltMove(e, sidebarRef.current, 1)}
            onMouseLeave={() => handleTiltLeave(sidebarRef.current)}
          >
            <div className="panel-section">
              <h3>My Habits</h3>
              <div className="habits-list">
                {habits.map(habit => (
                  <div key={habit.id} className="habit-item-sidebar">
                    <div className="habit-info-sidebar">
                      <span className="habit-emoji-sidebar">{habit.emoji}</span>
                      <span className="habit-name-sidebar">{habit.name}</span>
                    </div>
                    <div className="habit-actions-sidebar">
                      <span className="legend-color" style={{ background: habit.color, boxShadow: `0 0 6px ${habit.color}` }}></span>
                      <button onClick={() => handleDeleteHabit(habit.id)} className="delete-habit-btn" title="Delete Habit">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-section">
              <h3>Create Habit</h3>
              <form onSubmit={handleAddHabit} className="add-habit-form">
                <div className="input-group">
                  <label>Habit Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Meditate" 
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    maxLength={25}
                    required
                  />
                </div>
                
                <div className="input-row">
                  <div className="input-group half">
                    <label>Emoji / Icon</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ⚡"
                      value={newHabitEmoji}
                      onChange={(e) => setNewHabitEmoji(e.target.value.trim() || '⚡')}
                      maxLength={2}
                      style={{ textAlign: 'center', fontWeight: 'bold' }}
                      required
                    />
                  </div>
                  
                  <div className="input-group half">
                    <label>Color</label>
                    <select value={newHabitColor} onChange={(e) => setNewHabitColor(e.target.value)}>
                      <option value="var(--cyan-accent)">Cyan</option>
                      <option value="var(--green-accent)">Green</option>
                      <option value="var(--purple-accent)">Purple</option>
                      <option value="var(--rose-accent)">Rose</option>
                      <option value="var(--amber-accent)">Amber</option>
                    </select>
                  </div>
                </div>

                <div style={{ margin: '4px 0 12px 0' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Quick Emoji Presets:</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['⚡', '🧘', '🏋️', '📖', '💻', '🏃', '💰', '🍷', '🍎', '💤'].map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewHabitEmoji(em)}
                        style={{
                          background: newHabitEmoji === em ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                          border: newHabitEmoji === em ? '1px solid var(--cyan-accent)' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#fff',
                          transition: 'all 0.2s'
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button type="submit" className="submit-btn"><Plus size={16} /> Add Routine</button>
              </form>
            </div>

            {/* settings area: notifications & reset button */}
            <div className="panel-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <h3>Settings</h3>
              
              <div className="toggle-item" style={{ marginBottom: '14px' }}>
                <span className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {remindersEnabled ? <Bell size={14} className="section-icon" /> : <BellOff size={14} />}
                  Daily Reminders
                </span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={remindersEnabled}
                    onChange={handleReminderToggle}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <button onClick={handleResetActiveMonth} className="reset-danger-btn">
                <RotateCcw size={14} />
                Reset Active Month
              </button>

              <button 
                onClick={handleClearAllHabits} 
                className="reset-danger-btn"
                style={{ background: 'rgba(244, 67, 54, 0.03)', borderColor: 'rgba(244, 67, 54, 0.15)', color: '#ff5252', marginTop: '10px' }}
              >
                <Trash2 size={14} />
                Wipe Habit List (Start Fresh)
              </button>
            </div>
          </aside>

          {/* Central grid viewport tab swapping */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeViewTab === 'grid' && (
              <>
                <section 
                  className="grid-panel glass-card tilt-effect"
                  ref={gridRef}
                  onMouseMove={(e) => handleTiltMove(e, gridRef.current, 0.5)}
                  onMouseLeave={() => handleTiltLeave(gridRef.current)}
                >
                  <div className="month-header-wrapper">
                    <div className="month-title-container">
                      <h2>{MONTH_NAMES[activeMonth]}</h2>
                      <span className="year-badge">{activeYear}</span>
                    </div>
                    <div className="month-nav">
                      <button onClick={() => setActiveMonth((activeMonth - 1 + 12) % 12)} className="nav-arrow-btn"><i className="fa-solid fa-chevron-left"></i></button>
                      <button onClick={() => setActiveMonth((activeMonth + 1) % 12)} className="nav-arrow-btn"><i className="fa-solid fa-chevron-right"></i></button>
                    </div>
                  </div>

                  <div className="spreadsheet-container" ref={spreadsheetRef}>
                    <table className="habit-spreadsheet">
                      <thead>
                        <tr>
                          <th className="habit-name-col">My Habits</th>
                          {getWeeksHeaders().map(week => (
                            <th key={week.key} className="week-header" colSpan={week.span}>{week.title}</th>
                          ))}
                        </tr>
                        <tr>
                          <th className="habit-name-col"></th>
                          {daysArr.map(day => (
                            <th key={day.dayNum}>
                              <span className="day-num-header">{day.dayNum}</span>
                              <span className="day-name-header">{day.dayName}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {habits.length === 0 ? (
                          <tr>
                            <td colSpan={daysInMonth + 1} style={{ padding: '30px', color: 'var(--text-muted)' }}>Create habits in the sidebar to populate grid.</td>
                          </tr>
                        ) : (
                          habits.map((habit, idx) => (
                          <tr key={habit.id}>
                            <td className="habit-name-col">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '1rem' }}>{habit.emoji}</span>
                                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '120px' }}>{habit.name}</span>
                                </div>
                                <div className="reorder-btns" style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginLeft: '6px' }}>
                                  <button 
                                    onClick={() => handleReorderHabit(idx, -1)} 
                                    disabled={idx === 0}
                                    style={{ background: 'none', border: 'none', padding: '0', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '10px', width: '12px' }}
                                    title="Move Up"
                                    className="reorder-btn"
                                  >
                                    <ChevronUp size={11} />
                                  </button>
                                  <button 
                                    onClick={() => handleReorderHabit(idx, 1)} 
                                    disabled={idx === habits.length - 1}
                                    style={{ background: 'none', border: 'none', padding: '0', cursor: idx === habits.length - 1 ? 'not-allowed' : 'pointer', color: idx === habits.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '10px', width: '12px' }}
                                    title="Move Down"
                                    className="reorder-btn"
                                  >
                                    <ChevronDown size={11} />
                                  </button>
                                </div>
                              </div>
                            </td>
                              {daysArr.map(day => {
                                const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day.dayNum).padStart(2, '0')}`;
                                const isChecked = !!(history[dateStr] && history[dateStr][habit.id]);
                                return (
                                  <td key={day.dayNum}>
                                    <div 
                                      className={`custom-checkbox ${isChecked ? 'checked' : ''}`}
                                      style={{ '--accent-glow': habit.color }}
                                      onClick={(e) => handleCheckboxToggle(e, habit.id, day.dayNum)}
                                    >
                                      <Check />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        {/* Progress Row */}
                        <tr className="stat-row" id="progress-percentage-row">
                          <td className="habit-name-col">Progress %</td>
                          {daysArr.map(day => {
                            const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day.dayNum).padStart(2, '0')}`;
                            let checkedCount = 0;
                            habits.forEach(h => {
                              if (history[dateStr] && history[dateStr][h.id]) checkedCount++;
                            });
                            const rate = habits.length > 0 ? Math.round((checkedCount / habits.length) * 100) : 0;
                            return (
                              <td 
                                key={day.dayNum} 
                                style={{ color: habits.length > 0 ? getProgressColor(rate) : 'var(--text-secondary)' }}
                              >
                                {habits.length > 0 ? `${rate}%` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                        
                        {/* Done Row */}
                        <tr className="stat-row">
                          <td className="habit-name-col">Done</td>
                          {daysArr.map(day => {
                            const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day.dayNum).padStart(2, '0')}`;
                            let checkedCount = 0;
                            habits.forEach(h => {
                              if (history[dateStr] && history[dateStr][h.id]) checkedCount++;
                            });
                            return <td key={day.dayNum}>{checkedCount}</td>;
                          })}
                        </tr>

                        {/* Not Done Row */}
                        <tr className="stat-row">
                          <td className="habit-name-col">Not Done</td>
                          {daysArr.map(day => {
                            const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day.dayNum).padStart(2, '0')}`;
                            let checkedCount = 0;
                            habits.forEach(h => {
                              if (history[dateStr] && history[dateStr][h.id]) checkedCount++;
                            });
                            return <td key={day.dayNum}>{habits.length - checkedCount}</td>;
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                {/* Lower Trend Line Chart */}
                <TrendChart habits={habits} history={history} activeMonth={activeMonth} activeYear={activeYear} />
              </>
            )}

            {activeViewTab === 'reports' && (
              <WeeklyReports habits={habits} history={history} activeMonth={activeMonth} activeYear={activeYear} />
            )}

            {activeViewTab === 'manual' && (
              <section className="reports-layout-panel glass-card">
                <h2>AetherTrack Operations Manual</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <p>Welcome to AetherTrack, a React-based high-fidelity habit tracking platform. Here is how you optimize your dashboard:</p>
                  <div>
                    <h4 style={{ color: 'var(--cyan-accent)', marginBottom: '4px' }}>Supabase Synchronization</h4>
                    <p>If connected to Supabase in your backend, all habit edits and logs sync to the cloud automatically. If running in Local Mode, everything is written to browser local storage so it remains completely isolated to your device.</p>
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--purple-accent)', marginBottom: '4px' }}>Streak Rescue Alert</h4>
                    <p>The system constantly checks if you have logged anything today. If you haven't checked anything off by afternoon, it triggers a warning card to protect your streak.</p>
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--green-accent)', marginBottom: '4px' }}>Weekly Progress Analyst</h4>
                    <p>The Weekly Reports tab uses local analytics to give you actionable advice based on your strengths and consistency weaknesses for that week.</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {/* Sheets Tab Bar Navigation */}
        <footer className="app-footer">
          <div className="tabs-container">
            <button 
              onClick={() => setActiveViewTab('manual')} 
              className={`sheet-tab ${activeViewTab === 'manual' ? 'active' : ''}`}
            >
              <HelpCircle size={14} /> Manual
            </button>
            <button 
              onClick={() => setActiveViewTab('grid')} 
              className={`sheet-tab ${activeViewTab === 'grid' ? 'active' : ''}`}
            >
              <CheckSquare size={14} /> Grid Tracker
            </button>
            <button 
              onClick={() => setActiveViewTab('reports')} 
              className={`sheet-tab ${activeViewTab === 'reports' ? 'active' : ''}`}
            >
              <BarChart3 size={14} /> Weekly Reports
            </button>
            <div className="sheet-divider"></div>
            
            {MONTH_NAMES.map((mName, mIdx) => (
              <button 
                key={mIdx} 
                onClick={() => {
                  setActiveViewTab('grid');
                  setActiveMonth(mIdx);
                }} 
                className={`sheet-tab ${activeViewTab === 'grid' && activeMonth === mIdx ? 'active' : ''}`}
              >
                {mName.substring(0, 3)}
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
