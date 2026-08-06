import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Divider,
  CircularProgress,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const COLORS = ['#0b5394', '#00bcd4', '#8fce00', '#ffd666', '#f44336', '#9c27b0', '#e91e63', '#ff9800', '#795548', '#607d8b'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tableTab, setTableTab] = useState(0); // 0 = Daily Income, 1 = Expenses, 2 = Income by Service
  const [filterType, setFilterType] = useState('monthly'); // 'monthly' | 'annual'
  
  const currentLocalDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentLocalDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentLocalDate.getFullYear());

  const monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const yearsList = [2024, 2025, 2026, 2027, 2028];

  const fetchStats = async () => {
    try {
      const mParam = filterType === 'annual' ? 0 : selectedMonth;
      const response = await api.get(`/api/dashboard/stats?year=${selectedYear}&month=${mParam}`);
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard statistics.');
      console.error(err);
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadStats();
  }, [filterType, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const lowStockProducts = stats?.soapStocks?.filter(item => item.isLow) || [];
  
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 2 }}>
      {/* Header bar inline filters (combines filters & title on one row) */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 2, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 'extraBold', textTransform: 'uppercase', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            {filterType === 'monthly'
              ? `${monthsList.find(m => m.value === selectedMonth)?.label.toUpperCase()} ${selectedYear}`
              : `ANNUAL REPORT ${selectedYear}`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
            Tacky's Laundry • Manager Overview
          </Typography>
        </Box>
        
        {/* Inline Controls */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup
            value={filterType}
            exclusive
            onChange={(e, val) => { if (val) setFilterType(val); }}
            size="small"
            sx={{
              height: 36,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: '2px',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '6px !important',
                textTransform: 'none',
                fontWeight: 'bold',
                px: 2,
                py: 0.5,
              }
            }}
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="annual">Annual</ToggleButton>
          </ToggleButtonGroup>

          {filterType === 'monthly' && (
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                sx={{ borderRadius: 2, height: 36 }}
              >
                {monthsList.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 85 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{ borderRadius: 2, height: 36 }}
            >
              {yearsList.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, py: 0 }}>
          {error}
        </Alert>
      )}

      {/* Horizontally Scrollable Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningIcon fontSize="small" />}
          sx={{
            py: 0.5,
            px: 2,
            borderRadius: 2,
            mb: 2,
            border: '1px solid #ffe0b2',
            '& .MuiAlert-message': {
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#b26a00', whiteSpace: 'nowrap' }}>
              Low Stock:
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                py: 0.3,
                width: '100%',
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(245,127,23,0.2)', borderRadius: 2 }
              }}
            >
              {lowStockProducts.map(p => (
                <Chip
                  key={p.id}
                  label={`${p.name}: ${p.currentStock.toFixed(1)} / ${p.minStock.toFixed(1)} ${p.unit}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{
                    fontWeight: 'bold',
                    bgcolor: 'white',
                    fontSize: '0.7rem',
                    height: 20,
                    whiteSpace: 'nowrap'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Alert>
      )}

      {/* Two Column Compact Layout */}
      <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
        {/* Left Column: Metrics & Charts */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={2}>
            
            {/* CASHFLOW METRIC CARDS - Rendered on a single row (xs={4}) */}
            <Box>
              <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
                {/* INCOME */}
                <Grid item xs={4}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1.5px solid #d4e157',
                      bgcolor: '#f1f8e9',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography color="#33691e" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block', lineHeight: 1.2 }}>
                        INCOME
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.2, color: '#33691e', fontSize: '1.4rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(stats?.totalRevenue)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* EXPENSES */}
                <Grid item xs={4}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1.5px solid #f8b4b4',
                      bgcolor: '#fde8e8',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography color="#c81e1e" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block', lineHeight: 1.2 }}>
                        EXPENSES
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.2, color: '#c81e1e', fontSize: '1.4rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(stats?.totalExpenses)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* PROFIT */}
                <Grid item xs={4}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1.5px solid #80cbc4',
                      bgcolor: '#e0f2f1',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography color="#004d40" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block', lineHeight: 1.2 }}>
                        PROFIT
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.2, color: '#004d40', fontSize: '1.4rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(stats?.netProfit)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* CHARTS CONTAINER GRID - Side-by-side, enlarged to 180px */}
            <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
              {/* EXPENSES DONUT CHART */}
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark', display: 'block', mb: 1.5 }}>
                      MONTHLY EXPENSES
                    </Typography>
                    <Box sx={{ position: 'relative', width: '100%', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.expenseCategoryBreakdown && stats.expenseCategoryBreakdown.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.expenseCategoryBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={95}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {stats.expenseCategoryBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', lineHeight: 1 }}>Total</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.dark', fontSize: '1.25rem' }}>
                              {formatCurrency(stats.totalExpenses)}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: '50%', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Expenses</Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Legend list - Compact with scroll bar */}
                    <Box sx={{ mt: 1.5, maxHeight: 140, overflowY: 'auto', pr: 0.5 }}>
                      {stats?.expenseCategoryBreakdown?.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.7rem' }}>{item.name}</Typography>
                          </Stack>
                          <Typography sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                            {formatCurrency(item.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* INCOME DONUT CHART */}
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark', display: 'block', mb: 1.5 }}>
                      MONTHLY INCOME BY SERVICE
                    </Typography>
                    <Box sx={{ position: 'relative', width: '100%', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.incomeServiceBreakdown && stats.incomeServiceBreakdown.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.incomeServiceBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={95}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {stats.incomeServiceBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', lineHeight: 1 }}>Total</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.dark', fontSize: '1.25rem' }}>
                              {formatCurrency(stats.totalRevenue)}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: '50%', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Services</Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Legend list - Compact with scroll bar */}
                    <Box sx={{ mt: 1.5, maxHeight: 140, overflowY: 'auto', pr: 0.5 }}>
                      {stats?.incomeServiceBreakdown?.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.7rem' }}>{item.name}</Typography>
                          </Stack>
                          <Typography sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                            {formatCurrency(item.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Grid>

        {/* Right Column: Tabbed Tables - Height scaled to align with left column */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', '&:last-child': { pb: 2 } }}>
              <Tabs
                value={tableTab}
                onChange={(e, val) => setTableTab(val)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5, minHeight: 36, '& .MuiTab-root': { py: 0.5, minHeight: 36, fontSize: '0.75rem', fontWeight: 'bold' } }}
              >
                <Tab label="Income By Date" />
                <Tab label="Expenses" />
                <Tab label="By Service" />
              </Tabs>

              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 450 }}>
                {tableTab === 0 && (
                  <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>Date</TableCell>
                          <TableCell align="right" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.incomeByDate && stats.incomeByDate.length > 0 ? (
                          stats.incomeByDate.map((row) => (
                            <TableRow key={row.name} hover>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.8 }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 0.8 }}>{formatCurrency(row.value)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: '0.8rem' }}>
                              No transactions recorded.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {tableTab === 1 && (
                  <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#ffe5e5', color: '#b71c1c', fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>Categories</TableCell>
                          <TableCell align="right" sx={{ bgcolor: '#ffe5e5', color: '#b71c1c', fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.expenseByCategory && stats.expenseByCategory.length > 0 ? (
                          stats.expenseByCategory.map((row) => (
                            <TableRow key={row.name} hover>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.8 }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 0.8, color: row.value > 0 ? '#b71c1c' : 'text.primary' }}>
                                {formatCurrency(row.value)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: '0.8rem' }}>
                              No expenses registered.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {tableTab === 2 && (
                  <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>Services</TableCell>
                          <TableCell align="right" sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.incomeByService && stats.incomeByService.length > 0 ? (
                          stats.incomeByService.map((row) => (
                            <TableRow key={row.name} hover>
                              <TableCell sx={{ fontSize: '0.8rem', py: 0.8 }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 0.8, color: row.value > 0 ? '#0d47a1' : 'text.primary' }}>
                                {formatCurrency(row.value)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: '0.8rem' }}>
                              No service revenues recorded.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
