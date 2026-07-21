const navigation = [
  'Обзор',
  'Моделирование',
  'Сценарии испытаний',
  'История запусков',
  'Журнал событий',
  'Параметры',
  'Состояние системы',
  'Документация',
];
const components = [
  ['Бортовая логика', 'Каркас запущен'],
  ['Виртуальная модель', 'Физическая модель ещё не реализована'],
  ['Шлюз данных', 'Ожидает синтетические сообщения'],
  ['Средство запуска сценариев', 'Доступна только проверка каркаса'],
  ['Контроль безопасности', 'Логика переходов будет добавлена на следующем этапе'],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#14213d_0,#070b14_42%)] px-6 py-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl flex-col gap-6 border-b border-slate-700/70 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
            Только виртуальное моделирование
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">SecFly</h1>
          <p className="mt-2 max-w-2xl text-lg text-slate-300">
            Система моделирования безопасного автономного управления
          </p>
        </div>
        <p className="text-sm text-slate-400">Версия 0.1.0 · Все данные синтетические</p>
      </header>
      <nav aria-label="Основные разделы" className="mx-auto mt-6 flex max-w-7xl flex-wrap gap-2">
        {navigation.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replaceAll(' ', '-')}`}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            {item}
          </a>
        ))}
      </nav>
      <section aria-labelledby="components-title" className="mx-auto mt-10 max-w-7xl">
        <h2 id="components-title" className="text-2xl font-semibold">
          Состояние компонентов
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {components.map(([name, state]) => (
            <article
              key={name}
              className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 shadow-xl shadow-black/10"
            >
              <div className="mb-4 h-1 w-12 rounded bg-cyan-400" />
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                <span className="text-slate-500">Состояние: </span>
                {state}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
          <h2 className="text-xl font-semibold text-amber-100">Ограничения текущей версии</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Текущая версия SecFly предназначена только для виртуального моделирования. Она не
            подключается к реальным летательным аппаратам, датчикам, каналам управления или
            исполнительным устройствам.
          </p>
        </article>
        <article className="rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-6">
          <h2 className="text-xl font-semibold text-cyan-100">Что будет реализовано далее</h2>
          <ul className="mt-3 grid gap-2 text-slate-300">
            {[
              'синтетическая модель аппарата',
              'виртуальная телеметрия',
              'моделирование канала связи',
              'конечный автомат безопасных режимов',
              'сценарии неисправностей',
              'журнал решений',
              'детерминированное повторное воспроизведение',
            ].map((item) => (
              <li key={item}>— {item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
