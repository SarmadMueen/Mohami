// components/layout/Header.js
import React from 'react';
import Link from 'next/link';

const Header = () => {
  return (
    <header>
      <nav>
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/login">Login</Link>
          </li>
          <li>
            <Link href="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link href="/clients">Clients</Link>
            <ul>
              <li>
                <Link href="/clients/new">Add New Client</Link>
              </li>
            </ul>
          </li>
          <li>
            <Link href="/cases">Cases</Link>
            <ul>
              <li>
                <Link href="/cases/new">Add New Case</Link>
              </li>
              <li>
                <Link href="/cases/litigation">Litigation Stage</Link>
              </li>
              <li>
                <Link href="/cases/court-sessions">Court Sessions</Link>
              </li>
            </ul>
          </li>
          <li>
            <Link href="/lawyers">Lawyers</Link>
          </li>
          <li>
            <Link href="/calendar">Calendar</Link>
          </li>
          <li>
            <Link href="/billing">Billing</Link>
          </li>
          <li>
            <Link href="/reports">Reports</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
