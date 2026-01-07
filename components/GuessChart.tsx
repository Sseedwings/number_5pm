
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

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  
  // 색상 정의: 높음(주황), 낮음(청록), 정답(초록)
  const color = payload.direction === 'correct' ? '#4ade80' : 
                payload.direction === 'high' ? '#fb923c' : '#22d3ee';
  
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="#0f172a" strokeWidth={2} />
      {/* 빛나는 효과를 위한 추가 원 */}
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.2} />
    </g>
  );
};

const GuessChart: React.FC<GuessChartProps> = ({ guesses, target, showTarget }) => {
  const data = guesses.map((g, idx) => ({
    attempt: idx + 1,
    value: g.value,
    distance: g.distance,
    direction: g.direction
  }));

  return (
    <div className="w-full h-48 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="attempt" 
            stroke="#94a3b8" 
            tick={{fontSize: 10}}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="#94a3b8" 
            tick={{fontSize: 10}}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
            formatter={(value, name, props: any) => {
              const dir = props.payload.direction;
              const dirText = dir === 'correct' ? '정답' : dir === 'high' ? '높음' : '낮음';
              return [`${value} (${dirText})`, '추측값'];
            }}
            labelFormatter={(label) => `${label}회차 공명`}
          />
          {showTarget && (
            <ReferenceLine 
              y={target} 
              label={{ value: '목표 주파수', position: 'insideBottomRight', fill: '#4ade80', fontSize: 10, fontWeight: 'bold' }} 
              stroke="#4ade80" 
              strokeDasharray="5 5" 
              strokeWidth={2}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="rgba(148, 163, 184, 0.3)" 
            strokeWidth={2} 
            dot={<CustomDot />}
            activeDot={{ r: 8, strokeWidth: 0, fill: '#fff' }}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GuessChart;
