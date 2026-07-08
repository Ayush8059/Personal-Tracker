import React, { useRef } from 'react';
import { handleTiltMove, handleTiltLeave } from '../utils/effects';
import { Award, Zap, BookOpen, Smile, Info } from 'lucide-react';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function WeeklyReports({ habits, history, activeMonth, activeYear }) {
  const containerRef = useRef(null);

  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const totalHabits = habits.length;

  if (totalHabits === 0) {
    return (
      <section className="reports-layout-panel glass-card">
        <h2>Weekly Analytics Report</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '30px' }}>
          No active habits found. Please define habits in the sidebar to generate reports.
        </p>
      </section>
    );
  }

  // Segment month into weeks
  const getWeeksRange = () => {
    const weeks = [
      { id: 1, start: 1, end: 7 },
      { id: 2, start: 8, end: 14 },
      { id: 3, start: 15, end: 21 },
      { id: 4, start: 22, end: 28 },
      { id: 5, start: 29, end: daysInMonth }
    ];
    // If month has only 28 days (February), remove Week 5
    if (daysInMonth <= 28) weeks.pop();
    return weeks;
  };

  const weeks = getWeeksRange();

  // Process data for a given week range
  const analyzeWeek = (startDay, endDay) => {
    const totalDaysInWeek = (endDay - startDay) + 1;
    const possibleChecks = totalDaysInWeek * totalHabits;
    
    let checkedCount = 0;
    const habitStats = {}; // { habitId: { checked: 0, possible: totalDaysInWeek } }
    
    habits.forEach(h => {
      habitStats[h.id] = { name: h.name, emoji: h.emoji, checked: 0, color: h.color };
    });

    for (let day = startDay; day <= endDay; day++) {
      const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      habits.forEach(habit => {
        if (history[dateStr] && history[dateStr][habit.id]) {
          checkedCount++;
          habitStats[habit.id].checked++;
        }
      });
    }

    const rate = possibleChecks > 0 ? Math.round((checkedCount / possibleChecks) * 100) : 0;
    
    // Sort habits to find best/worst performing
    const sortedStats = Object.values(habitStats).sort((a, b) => b.checked - a.checked);
    const bestHabit = sortedStats[0];
    const worstHabit = sortedStats[sortedStats.length - 1];

    // Determine performance tier badge
    let badgeText = 'Inactive';
    let badgeClass = 'none';
    if (rate >= 80) {
      badgeText = 'Gold Champion 🏆';
      badgeClass = 'gold';
    } else if (rate >= 50) {
      badgeText = 'Silver Achiever 🥈';
      badgeClass = 'silver';
    } else if (rate > 0) {
      badgeText = 'Bronze Starter 🥉';
      badgeClass = 'bronze';
    }

    // Build coaching tip
    let coachingTip = "";
    if (rate === 0) {
      coachingTip = "No routines logged this week. Check off boxes on the grid tracker to unlock this analysis!";
    } else if (rate === 100) {
      coachingTip = "Perfect score! Outstanding consistency across all routines. You are operating at peak efficiency.";
    } else {
      coachingTip = `Solid effort! Your primary strength this week was <strong>${bestHabit.emoji} ${bestHabit.name}</strong> (${Math.round((bestHabit.checked / totalDaysInWeek) * 100)}% execution). Focus more attention on <strong>${worstHabit.emoji} ${worstHabit.name}</strong> (${Math.round((worstHabit.checked / totalDaysInWeek) * 100)}% execution) next week to boost consistency.`;
    }

    return {
      rate,
      badgeText,
      badgeClass,
      coachingTip,
      checkedCount,
      possibleChecks
    };
  };

  return (
    <section 
      className="reports-layout-panel glass-card tilt-effect"
      ref={containerRef}
      onMouseMove={(e) => handleTiltMove(e, containerRef.current, 0.5)}
      onMouseLeave={() => handleTiltLeave(containerRef.current)}
    >
      <div className="month-header-wrapper">
        <div className="month-title-container">
          <h2>Weekly Progress Analyst</h2>
          <span className="year-badge">{MONTH_NAMES[activeMonth]} {activeYear}</span>
        </div>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '10px' }}>
        <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
        Weekly reports split your habit history into calendar phases, analyzing streaks and delivering behavioral coaching insights.
      </p>

      <div className="reports-grid">
        {weeks.map(week => {
          const report = analyzeWeek(week.start, week.end);
          return (
            <div key={week.id} className="week-report-card">
              <div className="report-card-header">
                <h4>Week {week.id}</h4>
                <span className={`report-badge ${report.badgeClass}`}>
                  {report.badgeText}
                </span>
              </div>
              
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Days {week.start} to {week.end}
              </p>

              <div className="report-completion-wrapper">
                <div className="report-completion-lbl">
                  <span>Completion Rate</span>
                  <span>{report.rate}%</span>
                </div>
                <div className="completion-bar-outer">
                  <div 
                    className="completion-bar-inner" 
                    style={{ 
                      width: `${report.rate}%`,
                      background: report.rate >= 80 ? 'linear-gradient(to right, var(--cyan-accent), var(--green-accent))' : 
                                  report.rate >= 50 ? 'linear-gradient(to right, var(--purple-accent), var(--cyan-accent))' : 
                                  'linear-gradient(to right, var(--rose-accent), var(--purple-accent))'
                    }}
                  />
                </div>
              </div>

              <div className="report-coaching-box">
                <p className="coaching-tip" dangerouslySetInnerHTML={{ __html: report.coachingTip }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
