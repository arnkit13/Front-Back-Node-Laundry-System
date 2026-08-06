import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
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
  Fab,
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 8, position: 'relative' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'extraBold', color: 'primary.dark' }}>
            Expenses Ledger
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Financial Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
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
                Total Operational
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#c81e1e' }}>
                {formatCurrency(totalExpenseSum)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1.5px solid #ffe885',
              bgcolor: '#fffde7',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2, px: 2.5 }}>
              <Typography color="#f57f17" variant="overline" sx={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'block' }}>
                Total Entries
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#f57f17' }}>
                {expenses.length} Logs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
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
                Average Cost
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#004d40' }}>
                {formatCurrency(expenses.length > 0 ? (totalExpenseSum / expenses.length) : 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Role Banner */}
      <Alert severity="success" sx={{ mb: 3, borderRadius: 3, border: '1px solid #c8e6c9', bgcolor: '#e8f5e9', color: '#2e7d32' }}>
        Welcome back, Shop Manager (Admin)!
      </Alert>

      {/* Card List of Expenses */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : expenses.length > 0 ? (
        <Grid container spacing={2}>
          {expenses.map((exp) => (
            <Grid item xs={12} key={exp.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {/* Left Column details */}
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {exp.category}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {exp.date} • {exp.branch ? exp.branch.name : 'All Branches (Global)'}
                    </Typography>
                    {exp.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {exp.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Right Column rate and action icons */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 'extraBold', color: '#c81e1e' }}>
                      {formatCurrency(exp.amount)}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton onClick={() => handleOpenEditModal(exp)} color="default" size="small">
                        <EditIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteExpense(exp.id)} color="error" size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 3 }}>
          <Typography color="text.secondary">No expense logs recorded in database.</Typography>
        </Card>
      )}

      {/* FAB to Add Expense */}
      <Fab
        color="primary"
        variant="extended"
        onClick={handleOpenAddModal}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          fontWeight: 'bold',
          textTransform: 'none',
          px: 3,
          boxShadow: '0 4px 14px rgba(11, 83, 148, 0.4)',
        }}
      >
        <AddIcon sx={{ mr: 1 }} />
        Record Expense
      </Fab>

      {/* Record/Edit Expense Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExpenseIcon color="primary" />
          {editingExpenseId ? 'Configure Expense Details' : 'Record Expense Entry'}
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
            <Button onClick={handleCloseModal} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              variant="contained"
              startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            >
              Save Entry
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Expenses;
