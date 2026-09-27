import TaskList from '@/components/TaskList';

export default function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-content">
          <div className="hero-badge">✦ Task & Team Management</div>
          <h1 className="hero-title">
            Organize your work,
            <br />
            <span className="hero-highlight">achieve more.</span>
          </h1>
          <p className="hero-description">
            TaskFlow helps you manage tasks, collaborate with your team, and
            track progress — all in one beautiful, intuitive platform.
          </p>
        </div>
        <div className="hero-glow"></div>
      </section>

      {/* Task Management Section */}
      <section className="container" id="tasks-section">
        <TaskList />
      </section>
    </div>
  );
}
