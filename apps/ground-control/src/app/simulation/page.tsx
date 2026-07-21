import { SimulationClient } from './simulation-client';
import './simulation.css';

export default function SimulationPage() {
  return (
    <main className="simulation-shell">
      <header className="simulation-header">
        <a href="/" className="back-link">
          ← Обзор SecFly
        </a>
        <span className="simulation-badge">Только виртуальное моделирование</span>
        <h1>Синтетическая модель аппарата</h1>
        <p>Используется упрощённая математическая модель. Реальное оборудование не подключено.</p>
      </header>
      <aside className="model-warning">
        Движение рассчитывается по упрощённой математической модели и не является физической моделью
        настоящего летательного аппарата.
      </aside>
      <SimulationClient />
    </main>
  );
}
