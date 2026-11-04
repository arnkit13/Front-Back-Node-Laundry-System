import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Avatar,
  Collapse,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  PersonOutlined,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  const slowTimerRef = useRef(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Silently wake up server on page load (eliminates cold-start delays while user types credentials)
  useEffect(() => {
    api.get('/api/health').catch(() => {
      // Ignored: silent background wake-up ping
    });
  }, []);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSubmitting(true);
    setSlowNotice(false);

    // If server takes longer than 4s (cloud cold start or initial DB connection), show notice
    slowTimerRef.current = setTimeout(() => {
      setSlowNotice(true);
    }, 4000);

    try {
      await login(username, password);
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin, { replace: true });
    } catch (err) {
      setError(err || 'Failed to authenticate. Try again.');
    } finally {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
      }
      setSlowNotice(false);
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(14, 165, 233, 0.15)',
          top: '-10%',
          right: '-5%',
          filter: 'blur(50px)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.2)',
          bottom: '-15%',
          left: '-10%',
          filter: 'blur(60px)',
        },
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          zIndex: 2,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header Branding */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar
              src="/logo.jpg"
              sx={{
                width: 56,
                height: 56,
                mb: 2,
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              }}
            />
            <Typography variant="h4" component="h1" align="center" color="primary.dark" sx={{ fontWeight: 'bold' }}>
              Tacky Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
              Laundry & Inventory Management
            </Typography>
          </Box>

          <Collapse in={!!error}>
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2 }}
                action={
                  error.includes('timed out') || error.includes('unreachable') || error.includes('connect') ? (
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      Retry
                    </Button>
                  ) : null
                }
              >
                {error}
              </Alert>
            )}
          </Collapse>

          <Collapse in={slowNotice}>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              Connecting to server... If the server was idle, warming up cloud hosting takes about 30–60 seconds. Please keep this open.
            </Alert>
          </Collapse>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlined color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={submitting}
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                borderRadius: 2,
              }}
            >
              {submitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>{slowNotice ? 'Waking up server...' : 'Connecting...'}</span>
                </Box>
              ) : (
                'Log In'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
