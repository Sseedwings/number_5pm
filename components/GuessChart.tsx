
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { GuessRecord } from '../types';

interface GuessChartProps {
  guesses: GuessRecord[];
  target: number;
  showTarget: boolean;
}

const GuessChart: React.FC<GuessChartProps> = ({ guesses, target, showTarget }) => {
  const data = guesses.map((g, idx) => ({
    attempt: idx + 1,
    value: g.value,
    distance: g.distance
  }));

  return (
    <div className="w-full h-48 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="attempt" 
            stroke="#94a3b8" 
            tick={{fontSize: 12}}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="#94a3b8" 
            tick={{fontSize: 12}}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            itemStyle={{ color: '#38bdf8' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            formatter={(value) => [`${value}`, '추측값']}
            labelFormatter={(label) => `${label}회차`}
          />
          {showTarget && (
            <ReferenceLine 
              y={target} 
              label={{ value: '목표 주파수', position: 'insideBottomRight', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} 
              stroke="#f43f5e" 
              strokeDasharray="5 5" 
              strokeWidth={2}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#38bdf8" 
            strokeWidth={3} 
            dot={{ fill: '#38bdf8', r: 5, strokeWidth: 2, stroke: '#0f172a' }} 
            activeDot={{ r: 7, strokeWidth: 0 }}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GuessChart;
