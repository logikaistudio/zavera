import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const BRANCH_COLORS = ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4'];

export default function RevenueChart({ data }) {
    // Find branch names dynamically from the data keys
    const branchNames = React.useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key !== 'date' && key !== 'revenue');
    }, [data]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-sm)',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <p style={{ margin: 0, marginBottom: '8px', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                        {payload[0].payload.date}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {payload.map((item, index) => (
                            <p key={index} style={{ margin: 0, color: item.color, fontSize: '13px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                                <span style={{ fontWeight: item.name.includes('Total') ? 700 : 500 }}>{item.name}:</span>
                                <span style={{ fontWeight: 700 }}>{formatCurrency(item.value)}</span>
                            </p>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                    dataKey="date"
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value;
                    }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '10px' }}
                />
                {/* Total Revenue Line */}
                <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Total Pendapatan"
                />
                {/* Branch Revenue Lines */}
                {branchNames.map((name, index) => (
                    <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={BRANCH_COLORS[index % BRANCH_COLORS.length]}
                        strokeWidth={1.5}
                        dot={{ fill: BRANCH_COLORS[index % BRANCH_COLORS.length], r: 2 }}
                        activeDot={{ r: 4 }}
                        name={name}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
