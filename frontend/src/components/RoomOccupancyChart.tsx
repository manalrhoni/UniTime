import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

interface RoomOccupancyData {
  roomId: string;
  roomName: string;
  occupancyRate: number;
}

interface RoomOccupancyChartProps {
  data: RoomOccupancyData[];
}

export function RoomOccupancyChart({ data }: RoomOccupancyChartProps) {
  const getColor = (rate: number) => {
    if (rate >= 75) return '#ef4444'; // Rouge pour surchargé
    if (rate >= 50) return '#f59e0b'; // Orange pour moyen
    return '#10b981'; // Vert pour bon
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Taux d'occupation des salles
        </CardTitle>
        <CardDescription>
          Visualisation graphique de l'utilisation des espaces
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="roomName" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => `${value}%`}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="occupancyRate" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.occupancyRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span>Bon (0-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Moyen (50-75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Surchargé (75-100%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
