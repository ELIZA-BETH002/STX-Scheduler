import React from 'react';
export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container">
      <h1>Stx Scheduler Dashboard</h1>
      <div className="stats-grid">
         <div className="stat-card">
           <h3>Total Scheduled</h3>
           <p>1,234 STX</p>
         </div>
      </div>
    </div>
  );
};
