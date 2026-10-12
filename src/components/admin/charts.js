// Validated categorical palette (dataviz validator: light mode, all checks pass)
export const SERIES = ['#3b63b8', '#d97706'];
export const AXIS = { stroke: '#a8a29e', fontSize: 11, tickLine: false, axisLine: false };
export const GRID = { stroke: '#f0efee', vertical: false };
export const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
export const rupees = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
