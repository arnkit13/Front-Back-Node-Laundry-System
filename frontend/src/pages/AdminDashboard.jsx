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
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
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
  LocalLaundryService as LaundryIcon,
  FitnessCenter as WeightIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  TrendingUp as ProfitIcon,
  AccountBalanceWallet as RevenueIcon,
  Payment as ExpenseIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0b5394', '#00bcd4', '#8fce00', '#ffd666', '#f44336', '#9c27b0', '#e91e63', '#ff9800', '#795548', '#607d8b'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tableTab, setTableTab] = useState(0); // 0 = Daily Income, 1 = Expenses, 2 = Income by Service

  // Date filters state
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
  
  // Format numbers to currency PHP
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 4 }}>
      
      {/* Dynamic Date Filter Bar */}
      <Card sx={{ mb: 4, p: 2.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ToggleButtonGroup
                value={filterType}
                exclusive
                onChange={(e, val) => {
                  if (val) setFilterType(val);
                }}
                size="small"
                color="primary"
              >
                <ToggleButton value="monthly" sx={{ fontWeight: 'bold', px: 2.5 }}>Monthly View</ToggleButton>
                <ToggleButton value="annual" sx={{ fontWeight: 'bold', px: 2.5 }}>Annual View</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              {filterType === 'monthly' && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {monthsList.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Year"
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 'bold', letterSpacing: '-0.5px' }}>
            {filterType === 'monthly'
              ? `${monthsList.find(m => m.value === selectedMonth)?.label.toUpperCase()} ${selectedYear}`
              : `ANNUAL REPORT ${selectedYear}`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            AquaClean Laundry Services • Shop Manager Dashboard
          </Typography>
        </Box>
      </Box>

      {/* LOW STOCK BANNER ALERTS */}
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

      {/* TWO COLUMN MAIN DASHBOARD LAYOUT */}
      <Grid container spacing={3}>
        {/* Left Column: Metrics & Charts */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            
            {/* CASHFLOW METRIC CARDS */}
            <Grid container spacing={3}>
              {/* INCOME */}
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    borderRadius: 3.5,
                    border: '2px solid #c5e1a5',
                    bgcolor: '#f1f8e9',
                    boxShadow: 'none',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}
                >
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography color="#33691e" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      INCOME
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: '800', mt: 0.5, color: '#33691e' }}>
                      {formatCurrency(stats?.totalRevenue)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* EXPENSES */}
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    borderRadius: 3.5,
                    border: '2px solid #f8b4b4',
                    bgcolor: '#fde8e8',
                    boxShadow: 'none',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}
                >
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography color="#c81e1e" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      EXPENSES
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: '800', mt: 0.5, color: '#c81e1e' }}>
                      {formatCurrency(stats?.totalExpenses)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* PROFIT */}
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    borderRadius: 3.5,
                    border: (stats?.netProfit || 0) >= 0 ? '2px solid #80cbc4' : '2px solid #f8b4b4',
                    bgcolor: (stats?.netProfit || 0) >= 0 ? '#e0f2f1' : '#fde8e8',
                    boxShadow: 'none',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}
                >
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography color={(stats?.netProfit || 0) >= 0 ? '#004d40' : '#c81e1e'} variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      PROFIT
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: '800', mt: 0.5, color: (stats?.netProfit || 0) >= 0 ? '#004d40' : '#c81e1e' }}>
                      {formatCurrency(stats?.netProfit)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* CHARTS CONTAINER GRID */}
            <Grid container spacing={3}>
              
              {/* EXPENSES DONUT CHART */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', textAlign: 'center', mb: 2 }}>
                      MONTHLY EXPENSES
                    </Typography>
                    <Box sx={{ width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.expenseCategoryBreakdown && stats.expenseCategoryBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.expenseCategoryBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
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
                      ) : (
                        <Box sx={{ p: 4, border: '1px dashed #ccc', borderRadius: '50%', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Expenses</Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Legend list */}
                    <Box sx={{ mt: 2, flexGrow: 1, overflowY: 'auto', maxHeight: 110 }}>
                      {stats?.expenseCategoryBreakdown?.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{item.name}</Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {formatCurrency(item.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* INCOME DONUT CHART */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', textAlign: 'center', mb: 2 }}>
                      MONTHLY INCOME
                    </Typography>
                    <Box sx={{ width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.incomeServiceBreakdown && stats.incomeServiceBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.incomeServiceBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
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
                      ) : (
                        <Box sx={{ p: 4, border: '1px dashed #ccc', borderRadius: '50%', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Services Revenue</Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Legend list */}
                    <Box sx={{ mt: 2, flexGrow: 1, overflowY: 'auto', maxHeight: 110 }}>
                      {stats?.incomeServiceBreakdown?.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{item.name}</Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {formatCurrency(item.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* MOP CHART */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', textAlign: 'center', mb: 2 }}>
                      MOP INCOME (CASH VS GCASH)
                    </Typography>
                    <Box sx={{ width: '100%', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {stats?.mopBreakdown && stats.mopBreakdown.some(item => item.value > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={stats.mopBreakdown}
                            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="value" name="Mode of Payment" radius={[4, 4, 0, 0]}>
                              <Cell fill="#0b5394" />
                              <Cell fill="#00bcd4" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">No Payment Records</Typography>
                        </Box>
                      )}
                    </Box>

                    {/* MOP stats breakdown */}
                    <Box sx={{ mt: 2 }}>
                      {stats?.mopBreakdown?.map((item) => (
                        <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{item.name}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
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
