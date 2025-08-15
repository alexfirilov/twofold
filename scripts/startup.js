#!/usr/bin/env node

// Startup script to initialize the database
const http = require('http');
const { spawn } = require('child_process');

// Wait for the app to be ready and then initialize
function initializeDatabase() {
  console.log('Initializing database...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/init',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('✓ Database initialized successfully');
        } else {
          console.error('✗ Database initialization failed:', response.error);
        }
      } catch (error) {
        console.error('✗ Failed to parse initialization response:', error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('✗ Failed to initialize database:', error.message);
  });

  req.end();
}

// Check if the app is ready
function checkAppReady() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000,
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('✓ App is ready, initializing database...');
      setTimeout(initializeDatabase, 1000); // Wait 1 second before initializing
    } else {
      console.log('App not ready yet, retrying in 5 seconds...');
      setTimeout(checkAppReady, 5000);
    }
  });

  req.on('error', () => {
    console.log('App not ready yet, retrying in 5 seconds...');
    setTimeout(checkAppReady, 5000);
  });

  req.setTimeout(5000, () => {
    console.log('Request timeout, retrying in 5 seconds...');
    setTimeout(checkAppReady, 5000);
  });

  req.end();
}

// Start the Next.js server in the background and wait for it to be ready
console.log('Starting Next.js server...');
const nextServer = spawn('npm', ['start'], {
  stdio: 'inherit',
  cwd: '/app',
});

// Start checking if the app is ready
setTimeout(checkAppReady, 10000); // Wait 10 seconds before first check

// Handle server exit
nextServer.on('close', (code) => {
  console.log(`Next.js server exited with code ${code}`);
  process.exit(code);
});

// Handle process signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  nextServer.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  nextServer.kill('SIGINT');
});