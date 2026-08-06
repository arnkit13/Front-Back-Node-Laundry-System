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
  AlertTitle,
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
    <Box sx={{ flexGrow: 1, pb: 4 }}>
      {/* Top Config Card with Segmented Toggle & Date Selectors */}
      <Card sx={{ mb: 4, p: 2.5, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(224, 224, 224, 0.5)' }}>
        <Grid container spacing={2.5} direction="column">
          <Grid item xs={12}>
            {/* Segmented Monthly/Annual view control */}
            <Box sx={{ border: '1px solid #dcdcdc', borderRadius: '8px', p: '2px', display: 'flex', bgcolor: 'transparent' }}>
              <Button
                fullWidth
                variant={filterType === 'monthly' ? 'contained' : 'text'}
                onClick={() => setFilterType('monthly')}
                sx={{
                  py: 1,
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  boxShadow: 'none',
                  bgcolor: filterType === 'monthly' ? 'primary.main' : 'transparent',
                  color: filterType === 'monthly' ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: filterType === 'monthly' ? 'primary.dark' : 'rgba(0,0,0,0.02)',
                    boxShadow: 'none',
                  }
                }}
              >
                Monthly Report
              </Button>
              <Button
                fullWidth
                variant={filterType === 'annual' ? 'contained' : 'text'}
                onClick={() => setFilterType('annual')}
                sx={{
                  py: 1,
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  boxShadow: 'none',
                  bgcolor: filterType === 'annual' ? 'primary.main' : 'transparent',
                  color: filterType === 'annual' ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: filterType === 'annual' ? 'primary.dark' : 'rgba(0,0,0,0.02)',
                    boxShadow: 'none',
                  }
                }}
              >
                Annual Report
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={2}>
              {filterType === 'monthly' && (
                <FormControl fullWidth size="small">
                  <InputLabel id="month-select-label">Month</InputLabel>
                  <Select
                    labelId="month-select-label"
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    sx={{ borderRadius: 2 }}
                  >
                    {monthsList.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl fullWidth size="small">
                <InputLabel id="year-select-label">Year</InputLabel>
                <Select
                  labelId="year-select-label"
                  value={selectedYear}
                  label="Year"
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{ borderRadius: 2 }}
                >
                  {yearsList.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Dynamic Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 'extraBold', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
          {filterType === 'monthly'
            ? `${monthsList.find(m => m.value === selectedMonth)?.label.toUpperCase()} ${selectedYear}`
            : `ANNUAL REPORT ${selectedYear}`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tacky's Laundry • Shop Manager Dashboard
        </Typography>
      </Box>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Alert severity="warning" sx={{ borderRadius: 3, border: '1px solid #ffe0b2' }}>
            <AlertTitle sx={{ fontWeight: 'bold' }}>Low Inventory Alert</AlertTitle>
            The following soap resources are running below minimum alert levels. Please restock soon:
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
              {lowStockProducts.map(p => (
                <Chip
                  key={p.id}
                  icon={<WarningIcon fontSize="small" />}
                  label={`${p.name}: ${p.currentStock.toFixed(1)} / ${p.minStock.toFixed(1)} ${p.unit}`}
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 'bold', bgcolor: 'white' }}
                />
              ))}
            </Stack>
          </Alert>
        </Box>
      )}

      {/* Two Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column: Metrics & Charts */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            
            {/* CASHFLOW METRIC CARDS (Income & Expenses side-by-side, Profit below) */}
            <Box>
              <Grid container spacing={2}>
                {/* INCOME (Green background and border) */}
                <Grid item xs={6}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1.5px solid #d4e157',
                      bgcolor: '#f1f8e9',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, px: 2.5 }}>
                      <Typography color="#33691e" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block' }}>
                        INCOME
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#33691e' }}>
                        {formatCurrency(stats?.totalRevenue)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* EXPENSES (Red background and border) */}
                <Grid item xs={6}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1.5px solid #f8b4b4',
                      bgcolor: '#fde8e8',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, px: 2.5 }}>
                      <Typography color="#c81e1e" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block' }}>
                        EXPENSES
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#c81e1e' }}>
                        {formatCurrency(stats?.totalExpenses)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* PROFIT (Cyan background and border, full width) */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1.5px solid #80cbc4',
                      bgcolor: '#e0f2f1',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, px: 2.5 }}>
                      <Typography color="#004d40" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block' }}>
                        PROFIT
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#004d40' }}>
                        {formatCurrency(stats?.netProfit)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* CHARTS CONTAINER GRID */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.dark', mt: 1 }}>
              Analytical Breakdowns
            </Typography>

            <Grid container spacing={3}>
              {/* EXPENSES DONUT CHART */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark', mb: 2 }}>
                      MONTHLY EXPENSES
                    </Typography>
                    <Box sx={{ position: 'relative', width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.expenseCategoryBreakdown && stats.expenseCategoryBreakdown.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.expenseCategoryBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
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
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold' }}>Total</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                              {formatCurrency(stats.totalExpenses)}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ p: 4, border: '1px dashed #ccc', borderRadius: '50%', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Expenses</Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Legend list */}
                    <Box sx={{ mt: 2, maxHeight: 110, overflowY: 'auto' }}>
                      {stats?.expenseCategoryBreakdown?.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>{item.name}</Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(item.value)} ({((item.value / (stats.totalExpenses || 1)) * 100).toFixed(1)}%)
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* INCOME DONUT CHART */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark', mb: 2 }}>
                      MONTHLY INCOME BY SERVICE
                    </Typography>
                    <Box sx={{ position: 'relative', width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.incomeServiceBreakdown && stats.incomeServiceBreakdown.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.incomeServiceBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
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
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold' }}>Total</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                              {formatCurrency(stats.totalRevenue)}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ p: 4, border: '1px dashed #ccc', borderRadius: '50%', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Service Revenues</Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Legend list */}
                    <Box sx={{ mt: 2, maxHeight: 110, overflowY: 'auto' }}>
                      {stats?.incomeServiceBreakdown?.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>{item.name}</Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(item.value)} ({((item.value / (stats.totalRevenue || 1)) * 100).toFixed(1)}%)
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

        {/* Right Column: Tabbed Tables */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Tabs
                value={tableTab}
                onChange={(e, val) => setTableTab(val)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, minHeight: 40 }}
              >
                <Tab label="Income By Date" sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1, minHeight: 40 }} />
                <Tab label="Expenses" sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1, minHeight: 40 }} />
                <Tab label="By Service" sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1, minHeight: 40 }} />
              </Tabs>

              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 420 }}>
                {tableTab === 0 && (
                  <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', fontSize: '0.75rem' }}>Date</TableCell>
                          <TableCell align="right" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', fontSize: '0.75rem' }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.incomeByDate && stats.incomeByDate.length > 0 ? (
                          stats.incomeByDate.map((row) => (
                            <TableRow key={row.name} hover>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{formatCurrency(row.value)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '0.8rem' }}>
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
                          <TableCell sx={{ bgcolor: '#ffe5e5', color: '#b71c1c', fontWeight: 'bold', fontSize: '0.75rem' }}>Categories</TableCell>
                          <TableCell align="right" sx={{ bgcolor: '#ffe5e5', color: '#b71c1c', fontWeight: 'bold', fontSize: '0.75rem' }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.expenseByCategory && stats.expenseByCategory.length > 0 ? (
                          stats.expenseByCategory.map((row) => (
                            <TableRow key={row.name} hover>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem', color: row.value > 0 ? '#b71c1c' : 'text.primary' }}>
                                {formatCurrency(row.value)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '0.8rem' }}>
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
                          <TableCell sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 'bold', fontSize: '0.75rem' }}>Services</TableCell>
                          <TableCell align="right" sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 'bold', fontSize: '0.75rem' }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats?.incomeByService && stats.incomeByService.length > 0 ? (
                          stats.incomeByService.map((row) => (
                            <TableRow key={row.name} hover>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem', color: row.value > 0 ? '#0d47a1' : 'text.primary' }}>
                                {formatCurrency(row.value)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '0.8rem' }}>
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
