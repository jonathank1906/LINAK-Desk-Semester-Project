import DeskControl from '../../components/DeskControl';
import PositionMemory from '../../components/PositionMemory';

export default function MyDesk() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">My Desk</h1>
      <DeskControl />
      <PositionMemory />
    </div>
  );
}