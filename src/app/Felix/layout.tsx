import FelixNav from './components/FelixNav';
import FelixAuthGate from './components/FelixAuthGate';

export default function FelixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FelixAuthGate>
      <FelixNav />
      {children}
    </FelixAuthGate>
  );
}
