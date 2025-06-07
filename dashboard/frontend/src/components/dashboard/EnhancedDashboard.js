import React, { useState, useEffect } from 'react';
import dashboardApi, { 
  formatBytes, 
  formatPercentage, 
  formatDuration, 
  getStatusColor, 
  getStatusIcon 
} from '../../services/dashboardApi';

const EnhancedDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    overview: null,
    agents: null,
    system: null,
    memory: null,
    loading: true,
    error: null
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    let cleanup = null;
    if (realTimeEnabled) {
      dashboardApi.startRealTimeUpdates((data) => {
        setDashboardData(prev => ({
          ...prev,
          ...data,
          loading: false,
          error: null
        }));
      }, 5000).then(cleanupFn => {
        cleanup = cleanupFn;
      });
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [realTimeEnabled]);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));
      
      const [overview, agents, system, memory] = await Promise.all([
        dashboardApi.getDashboardOverview(),
        dashboardApi.getAgents(),
        dashboardApi.getSystemHealth(),
        dashboardApi.getMemoryUsage()
      ]);

      setDashboardData({
        overview,
        agents,
        system,
        memory,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const openStreamlitDashboard = async () => {
    try {
      const sessionData = await dashboardApi.createStreamlitSession();
      if (sessionData.success) {
        // Open Streamlit in new tab with authentication
        const streamlitUrl = `${window.location.origin}/streamlit?session_id=${sessionData.session.session_id}&auth_token=${sessionData.redirect_params.auth_token}`;
        window.open(streamlitUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to open Streamlit dashboard:', error);
    }
  };

  if (dashboardData.loading && !dashboardData.overview) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '1.1rem',
        color: '#666'
      }}>
        🔄 Loading dashboard data...
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div style={{
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '1rem',
        margin: '1rem',
        color: '#dc2626'
      }}>
        <h3>❌ Dashboard Error</h3>
        <p>{dashboardData.error}</p>
        <button 
          onClick={loadDashboardData}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '0.5rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      margin: '1rem',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      minHeight: '600px'
    }}>
      {/* Dashboard Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        color: 'white',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>🧠 VANA Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            Real-time monitoring and analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            style={{
              background: realTimeEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {realTimeEnabled ? '🔄 Live' : '⏸️ Paused'}
          </button>
          <button
            onClick={openStreamlitDashboard}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📊 Advanced Analytics
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        background: 'white'
      }}>
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'agents', label: '🤖 Agents', icon: '🤖' },
          { id: 'system', label: '⚙️ System', icon: '⚙️' },
          { id: 'memory', label: '🧠 Memory', icon: '🧠' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#f3f4f6' : 'transparent',
              border: 'none',
              padding: '1rem 2rem',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              fontSize: '1rem',
              fontWeight: activeTab === tab.id ? '600' : 'normal',
              color: activeTab === tab.id ? '#667eea' : '#6b7280',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'overview' && <OverviewTab data={dashboardData.overview} />}
        {activeTab === 'agents' && <AgentsTab data={dashboardData.agents} />}
        {activeTab === 'system' && <SystemTab data={dashboardData.system} />}
        {activeTab === 'memory' && <MemoryTab data={dashboardData.memory} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data }) => {
  if (!data) return <div>Loading overview...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: '#374151' }}>System Overview</h2>
      
      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          title="Active Agents"
          value={`${data.summary?.active_agents || 0}/${data.summary?.total_agents || 0}`}
          icon="🤖"
          color="#10b981"
        />
        <StatCard
          title="System Health"
          value={data.summary?.system_health || 'Unknown'}
          icon="⚙️"
          color="#3b82f6"
        />
        <StatCard
          title="Memory Usage"
          value={formatPercentage(data.summary?.memory_usage_percent || 0)}
          icon="🧠"
          color="#8b5cf6"
        />
        <StatCard
          title="Avg Response Time"
          value={formatDuration(data.quick_stats?.avg_response_time || 0)}
          icon="⚡"
          color="#f59e0b"
        />
      </div>

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#374151', marginBottom: '1rem' }}>🚨 Active Alerts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.alerts.map((alert, index) => (
              <div
                key={index}
                style={{
                  background: alert.severity === 'high' ? '#fee2e2' : '#fef3c7',
                  border: `1px solid ${alert.severity === 'high' ? '#fecaca' : '#fde68a'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  color: alert.severity === 'high' ? '#dc2626' : '#d97706'
                }}
              >
                <strong>{alert.type.toUpperCase()}:</strong> {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Agents Tab Component
const AgentsTab = ({ data }) => {
  if (!data) return <div>Loading agents...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: '#374151' }}>Agent Status</h2>
      
      {/* Agent Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Agents" value={data.summary?.total || 0} icon="🤖" color="#6b7280" />
        <StatCard title="Active" value={data.summary?.active || 0} icon="✅" color="#10b981" />
        <StatCard title="Inactive" value={data.summary?.inactive || 0} icon="⭕" color="#f59e0b" />
        <StatCard title="Error" value={data.summary?.error || 0} icon="❌" color="#ef4444" />
      </div>

      {/* Agent List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {data.agents?.map(agent => (
          <div
            key={agent.id}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '2rem' }}>{agent.emoji}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151' }}>
                  {agent.name}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                  <span style={{ color: getStatusColor(agent.status) }}>
                    {getStatusIcon(agent.status)}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem' }}>
              {agent.description}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              fontSize: '0.8rem'
            }}>
              <div>
                <strong>Response Time:</strong><br />
                {formatDuration(agent.metrics?.response_time_ms || 0)}
              </div>
              <div>
                <strong>Success Rate:</strong><br />
                {formatPercentage(agent.metrics?.success_rate || 0)}
              </div>
              <div>
                <strong>Requests:</strong><br />
                {agent.metrics?.requests_count || 0}
              </div>
              <div>
                <strong>Memory:</strong><br />
                {formatBytes((agent.resources?.memory_usage_mb || 0) * 1024 * 1024)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// System Tab Component
const SystemTab = ({ data }) => {
  if (!data) return <div>Loading system data...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: '#374151' }}>System Health</h2>
      
      {/* Resource Usage */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <ResourceCard
          title="CPU Usage"
          percentage={data.resources?.cpu?.usage_percent || 0}
          details={`${data.resources?.cpu?.cores || 0} cores`}
          icon="🖥️"
        />
        <ResourceCard
          title="Memory Usage"
          percentage={data.resources?.memory?.usage_percent || 0}
          details={`${formatBytes((data.resources?.memory?.used_gb || 0) * 1024 * 1024 * 1024)} / ${formatBytes((data.resources?.memory?.total_gb || 0) * 1024 * 1024 * 1024)}`}
          icon="🧠"
        />
        <ResourceCard
          title="Disk Usage"
          percentage={data.resources?.disk?.usage_percent || 0}
          details={`${formatBytes((data.resources?.disk?.free_gb || 0) * 1024 * 1024 * 1024)} free`}
          icon="💾"
        />
      </div>

      {/* System Status */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>System Status</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <span style={{ color: getStatusColor(data.overall_status) }}>
            {getStatusIcon(data.overall_status)}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            {data.overall_status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          <strong>Uptime:</strong> {data.uptime?.formatted || 'Unknown'}
        </div>
      </div>
    </div>
  );
};

// Memory Tab Component
const MemoryTab = ({ data }) => {
  if (!data) return <div>Loading memory data...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: '#374151' }}>Memory Analytics</h2>
      
      {/* Memory Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        <StatCard
          title="ADK Memory Usage"
          value={formatBytes((data.adk_memory?.usage_mb || 0) * 1024 * 1024)}
          icon="🧠"
          color="#8b5cf6"
        />
        <StatCard
          title="Efficiency Score"
          value={formatPercentage(data.adk_memory?.efficiency_score || 0)}
          icon="⚡"
          color="#10b981"
        />
        <StatCard
          title="Cache Hit Rate"
          value={formatPercentage(data.adk_memory?.cache_hit_rate || 0)}
          icon="🎯"
          color="#3b82f6"
        />
        <StatCard
          title="Active Sessions"
          value={data.adk_memory?.session_count || 0}
          icon="👥"
          color="#f59e0b"
        />
      </div>
    </div>
  );
};

// Utility Components
const StatCard = ({ title, value, icon, color }) => (
  <div style={{
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: 'bold', color, marginBottom: '0.5rem' }}>
      {value}
    </div>
    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{title}</div>
  </div>
);

const ResourceCard = ({ title, percentage, details, icon }) => (
  <div style={{
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151' }}>{title}</h3>
        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{details}</div>
      </div>
    </div>
    
    {/* Progress Bar */}
    <div style={{
      background: '#f3f4f6',
      borderRadius: '8px',
      height: '8px',
      overflow: 'hidden',
      marginBottom: '0.5rem'
    }}>
      <div style={{
        background: percentage > 80 ? '#ef4444' : percentage > 60 ? '#f59e0b' : '#10b981',
        height: '100%',
        width: `${Math.min(percentage, 100)}%`,
        transition: 'width 0.3s ease'
      }} />
    </div>
    
    <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>
      {formatPercentage(percentage)}
    </div>
  </div>
);

export default EnhancedDashboard;
