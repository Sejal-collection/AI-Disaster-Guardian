import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RiskRadarProps {
  data: {
    seismic: number;
    weather: number;
    terrain: number;
    urban: number;
  };
}

const RiskRadar: React.FC<RiskRadarProps> = ({ data }) => {
  const chartData = [
    { subject: 'Seismic', A: data.seismic, fullMark: 100 },
    { subject: 'Weather', A: data.weather, fullMark: 100 },
    { subject: 'Terrain', A: data.terrain, fullMark: 100 },
    { subject: 'Urban Density', A: data.urban, fullMark: 100 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Risk Factors"
            dataKey="A"
            stroke="#ef4444"
            strokeWidth={2}
            fill="#ef4444"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskRadar;