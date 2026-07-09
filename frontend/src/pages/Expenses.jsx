import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Stack,
  CircularProgress,
  MenuItem,
  InputAdornment,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Payment as ExpenseIcon,
} from '@mui/icons-material';

const EXPENSE_CATEGORIES = [
  'Payroll',
  'Detergent',
  'Maintenance',
  'Fabric conditioner',
  'xonrox',
  'tape',
  'cellophane',
  'GASOL',
  'Utilities',
  'SALARY',
  'ELECTRIC BILL',
  'WATER BILL'
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog Form States
  const [openModal, setOpenModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null); // Null = Add, Number = Edit
  
  // Field States
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/api/expenses');
      setExpenses(response.data);
    } catch (err) {
      setError('Failed to fetch operational expenses ledger.');
      console.error(err);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/api/branches');
      setBranches(response.data);
    } catch (err) {
      console.error('Failed to load branches dropdown.', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    await fetchExpenses();
    await fetchBranches();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setCategory('Detergent');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setSelectedBranchId('');
    setFormError('');
    setOpenModal(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpenseId(exp.id);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setDate(exp.date);
    setDescription(exp.description || '');
    setSelectedBranchId(exp.branch?.id || '');
    setFormError('');
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!category) {
      setFormError('Please select or specify a category.');
      return;
    }
    if (amount === '' || parseFloat(amount) < 0) {
      setFormError('Amount must be greater than or equal to 0.');
      return;
    }
    if (!date) {
      setFormError('Please select a date.');
      return;
    }

    const payload = {
      category: category,
      amount: parseFloat(amount),
      date: date,
      description: description.trim(),
      branch: selectedBranchId ? { id: Number(selectedBranchId) } : null,
    };

    setSubmitting(true);
    try {
      if (editingExpenseId) {
        await api.put(`/api/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record expense entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense ledger entry?')) {
      return;
    }
    try {
      await api.delete(`/api/expenses/${id}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense entry.');
      console.error(err);
    }
  };

  const totalExpenseSum = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Operational Expenses Ledger
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddModal}
            sx={{ fontWeight: 'bold' }}
          >
            Record Expense
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Financial Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'error.main' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 'bold' }}>Total Operational Expenses</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                ₱{totalExpenseSum.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'warning.main' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 'bold' }}>Total Expenses Recorded</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                {expenses.length} Entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'info.main' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 'bold' }}>Average Cost Per Entry</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                ₱{expenses.length > 0 ? (totalExpenseSum / expenses.length).toFixed(2) : '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Expenses Ledger Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', borderRadius: 0 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Branch Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Description Details</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.length > 0 ? (
                    expenses.map((exp) => (
                      <TableRow key={exp.id} hover>
                        <TableCell>{exp.date}</TableCell>
                        <TableCell sx={{ fontWeight: 'medium', color: 'primary.dark' }}>{exp.category}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>₱{Number(exp.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{exp.branch ? exp.branch.name : <Typography component="span" variant="body2" color="text.disabled">All Branches (Global)</Typography>}</TableCell>
                        <TableCell>{exp.description || '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton onClick={() => handleOpenEditModal(exp)} color="primary" size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleDeleteExpense(exp.id)} color="error" size="small">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center' }}>
                        <Typography color="text.secondary">No expense logs recorded in database.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Record/Edit Expense Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExpenseIcon color="primary" />
          {editingExpenseId ? 'Modify Expense Entry' : 'Record Expense Entry'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Stack spacing={3}>
              <TextField
                required
                fullWidth
                select
                label="Expense Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                required
                fullWidth
                type="number"
                label="Amount Paid"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  inputProps: { min: "0.00", step: "0.01" }
                }}
              />

              <TextField
                required
                fullWidth
                type="date"
                label="Date of Transaction"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                select
                label="Branch Assignment (Optional)"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Branches (Global / Shared)</em>
                </MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Detailed Description"
                placeholder="Details about raw material purchase, utility billing period, worker name..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseModal} variant="outlined">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              variant="contained"
              startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            >
              {editingExpenseId ? 'Update Entry' : 'Save Entry'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Expenses;
