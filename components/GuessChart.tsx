
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
  
  // 색상 정의: 높음(선명한 주황), 낮음(진한 청록), 정답(에메랄드)
  const color = payload.direction === 'correct' ? '#10b981' : 
                payload.direction === 'high' ? '#f97316' : '#06b6d4';
  
  return (
    <g>
      {/* 바깥쪽 후광 효과 */}
      <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.3} className="animate-pulse" />
      {/* 메인 점 */}
      <circle cx={cx} cy={cy} r={7} fill={color} stroke="#0f172a" strokeWidth={2} />
      {/* 내부 하이라이트 */}
      <circle cx={cx} cy={cy} r={3} fill="#ffffff" opacity={0.4} />
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
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
            itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
            formatter={(value, name, props: any) => {
              const dir = props.payload.direction;
              const dirText = dir === 'correct' ? '정답' : dir === 'high' ? '너무 높음' : '너무 낮음';
              return [`${value} (${dirText})`, '주파수'];
            }}
            labelFormatter={(label) => `${label}회차 공명 결과`}
          />
          {showTarget && (
            <ReferenceLine 
              y={target} 
              label={{ value: '목표 주파수', position: 'insideBottomRight', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} 
              stroke="#10b981" 
              strokeDasharray="5 5" 
              strokeWidth={2}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="rgba(148, 163, 184, 0.2)" 
            strokeWidth={2} 
            dot={<CustomDot />}
            activeDot={{ r: 9, strokeWidth: 2, fill: '#fff', stroke: '#1e293b' }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GuessChart;
