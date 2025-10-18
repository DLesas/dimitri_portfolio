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
      <div className="pb-16 lg:pb-0">
        {children}
      </div>
    </FelixAuthGate>
  );
}
