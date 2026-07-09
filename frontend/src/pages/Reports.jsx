import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  TextField,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  BarChart as ChartIcon,
  LocalLaundryService as LaundryIcon,
  Scale as ScaleIcon,
  Science as SoapIcon,
  Store as BranchIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';

const Reports = () => {
  const [reportType, setReportType] = useState(0); // 0 = Daily, 1 = Weekly, 2 = Monthly
  const [reportData, setReportData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBranches = async () => {
    try {
      const response = await api.get('/api/branches');
      if (response.data && Array.isArray(response.data)) {
        setBranches(response.data);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Failed to load branches', err);
      setBranches([]);
    }
  };

  const fetchReports = async (type, branchId) => {
    setLoading(true);
    setError('');
    let endpoint = '/api/reports/daily';
    if (type === 1) endpoint = '/api/reports/weekly';
    if (type === 2) endpoint = '/api/reports/monthly';

    if (branchId) {
      endpoint += `?branchId=${branchId}`;
    }

    try {
      const response = await api.get(endpoint);
      if (response.data && Array.isArray(response.data)) {
        setReportData(response.data);
      } else {
        setReportData([]);
      }
    } catch (err) {
      setError('Failed to fetch reporting analytics data.');
      setReportData([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReports(reportType, selectedBranchId);
  }, [reportType, selectedBranchId]);

  const handleTabChange = (event, newValue) => {
    setReportType(newValue);
  };

  const handleBranchChange = (e) => {
    setSelectedBranchId(e.target.value);
  };

  // Compute overall aggregate summaries for cards based on active dataset
  const getAggregates = () => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return { totalWashes: 0, totalKg: 0, totalSoap: 0 };
    }
    const totalWashes = reportData.reduce((acc, curr) => acc + (curr?.transactionCount || 0), 0);
    const totalKg = reportData.reduce((acc, curr) => acc + (curr?.totalKgWashed || 0), 0);
    const totalSoap = reportData.reduce((acc, curr) => acc + (curr?.totalSoapUsed || 0), 0);
    return { totalWashes, totalKg, totalSoap };
  };

  // Compute aggregated machine usage details across reports
  const getMachineUsageData = () => {
    const machineCounts = {};
    if (!reportData || !Array.isArray(reportData)) {
      return [];
    }
    reportData.forEach((row) => {
      if (row && row.machineUsage) {
        Object.entries(row.machineUsage).forEach(([machine, count]) => {
          machineCounts[machine] = (machineCounts[machine] || 0) + count;
        });
      }
    });
    // Format for bar chart
    return Object.entries(machineCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const aggregates = getAggregates();
  const machineUsageData = getMachineUsageData();

  // Vibrant color palette for charts
  const COLORS = ['#0ea5e9', '#ea580c', '#10b981', '#a855f7'];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header with branch filter */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center" justifyContent="space-between">
        <Grid item xs={12} md={7}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            Laundry Activities & Consumption Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track business growth, wash volume metrics, and soap inventory consumption rates.
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            size="small"
            label="Filter by Branch"
            value={selectedBranchId}
            onChange={handleBranchChange}
            SelectProps={{
              startAdornment: <BranchIcon color="action" sx={{ mr: 1, ml: 0.5 }} />
            }}
          >
            <MenuItem value="">All Branches</MenuItem>
            {Array.isArray(branches) && branches.map(b => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Selector Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={reportType}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Daily Summaries" sx={{ fontWeight: 'bold', py: 2 }} />
          <Tab label="Weekly Summaries" sx={{ fontWeight: 'bold', py: 2 }} />
          <Tab label="Monthly Summaries" sx={{ fontWeight: 'bold', py: 2 }} />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={4}>
          {/* Aggregate Stats Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderTop: '4px solid', borderColor: 'primary.main' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', mx: 'auto', mb: 1.5 }}>
                    <LaundryIcon />
                  </Avatar>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Aggregate Washes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                    {aggregates.totalWashes}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total washes completed in this range
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderTop: '4px solid', borderColor: 'secondary.main' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ bgcolor: 'secondary.light', mx: 'auto', mb: 1.5 }}>
                    <ScaleIcon />
                  </Avatar>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Weight Processed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                    {aggregates.totalKg.toFixed(1)} kg
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total kilograms washed in this range
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderTop: '4px solid', borderColor: 'warning.main' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ bgcolor: 'warning.light', mx: 'auto', mb: 1.5 }}>
                    <SoapIcon />
                  </Avatar>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Soap Consumed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                    {aggregates.totalSoap.toFixed(2)} units
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total chemical resources consumed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* CHARTS CONTAINER (DYNAMIC & DUAL LAYOUT) */}
          {Array.isArray(reportData) && reportData.length > 0 ? (
            <Grid container spacing={3}>
              {/* Left Chart: Activity Trends */}
              <Grid item xs={12} lg={8}>
                <Card sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                    Activity and Consumption Trends
                  </Typography>
                  <Box sx={{ width: '100%' }}>
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart
                        data={Array.isArray(reportData) ? [...reportData].reverse() : []} // Show oldest-to-newest in the graph
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" label={{ value: 'Processed Weight (kg)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Soap Consumed', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="totalKgWashed" name="Weight (kg)" fill="#bae6fd" stroke="#0ea5e9" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="totalSoapUsed" name="Soap Used" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid>

              {/* Right Chart: Machine Usage Chart */}
              <Grid item xs={12} lg={4}>
                <Card sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                    Machine Utilization (Washes)
                  </Typography>
                  {machineUsageData.length > 0 ? (
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={machineUsageData}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip formatter={(value) => [`${value} washes`, 'Times Used']} />
                          <Bar dataKey="value" name="Times Used" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                            {machineUsageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" sx={{ mt: 2 }}>
                        {machineUsageData.map((item, idx) => (
                          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.name}: {item.value}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260 }}>
                      <Typography color="text.secondary" variant="body2">No machine tracking data captured.</Typography>
                    </Box>
                  )}
                </Card>
              </Grid>
            </Grid>
          ) : null}

          {/* Raw aggregates data grid */}
          <Card>
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', borderRadius: 0 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reporting Period</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Washes Completed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Weight Processed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Soap Consumed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Machine Counts Breakdown</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(reportData) && reportData.length > 0 ? (
                    reportData.map((row) => (
                      <TableRow key={row.period} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.period}</TableCell>
                        <TableCell>{row.transactionCount}</TableCell>
                        <TableCell>{row.totalKgWashed.toFixed(2)} kg</TableCell>
                        <TableCell>{row.totalSoapUsed.toFixed(2)}</TableCell>
                        <TableCell>
                          {row.machineUsage && Object.keys(row.machineUsage).length > 0 ? (
                            Object.entries(row.machineUsage).map(([machine, count]) => (
                              <Chip
                                key={machine}
                                size="small"
                                label={`${machine}: ${count}`}
                                variant="outlined"
                                color="primary"
                                sx={{ mr: 0.5, mb: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}
                              />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        No aggregated report records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      )}
    </Box>
  );
};

export default Reports;
