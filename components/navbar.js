import React from 'react';

const NavigationBar = () => {
  return (
    <nav>
      <ul className="nav-links">
        <li><a href="#">Home</a></li>
        <li><a href="#">Courses</a></li>
        <li><a href="#">Research</a></li>
        <li><a href="#">Staff</a></li>
        <li><a href="#">Partnerships</a></li>
        <li><a href="#">Events</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
      { /* eslint-disable-next-line react/no-unknown-property */ }
      <style jsx>{`
        nav {
          background-color: #0d47a1;
          color: #ffffff;
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }

        .nav-links {
          list-style: none;
          display: flex;
          align-items: center;
          margin: 0;
          padding: 0;
        }

        .nav-links li {
          margin: 0;
          padding: 0;
        }

        .nav-links a {
          color: #ffffff;
          text-decoration: none;
          font-size: 16px;
          margin: 0 20px;
          padding: 6px 12px;
          transition: background-color 0.3s;
        }

        .nav-links a:hover {
          background-color: #1565c0;
        }

        .nav-links a.active {
          background-color: #1e88e5;
        }
      `}</style>
    </nav>
  );
};

export default NavigationBar;
