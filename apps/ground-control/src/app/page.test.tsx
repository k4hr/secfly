import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from './page.js';
describe('главная страница', () => {
  it('содержит обязательные русские тексты и маркировку', () => {
    const html = renderToStaticMarkup(<HomePage />);
    for (const text of [
      'Только виртуальное моделирование',
      'Состояние компонентов',
      'Ограничения текущей версии',
      'Упрощённая синтетическая модель доступна',
      'Все данные синтетические',
    ])
      expect(html).toContain(text);
  });
});
