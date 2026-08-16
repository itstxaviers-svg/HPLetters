# Learn Letters

Светлый phonics + handwriting trainer на Vite, React и TypeScript.

## Запуск

```bash
npm install
npm run dev
```

Production-проверка:

```bash
npm run lint
npm run build
```

## Что реализовано

- профили учеников по имени и группе;
- local-first хранение прогресса, попыток, настроек и наград;
- последовательная разблокировка алфавита;
- единый Canvas/SVG tracing engine с Pointer Events;
- полноценные SVG-траектории Uppercase и Lowercase для всех 25 букв текущего учебного блока;
- непрерывное воспроизведение phonics-звука во время tracing (для букв с добавленным аудиофайлом);
- 3 успешные попытки из 5, uppercase → lowercase;
- learning accuracy и отдельный competition score;
- rewards cabinet и reward chest;
- teacher dashboard с группами, рейтингом и tie-break состоянием;
- адаптивная компоновка для desktop, tablet и mobile;
- `prefers-reduced-motion`.

Учительская блокировка в local-first версии защищает кабинет только на текущем устройстве. Для общего кабинета и настоящей серверной авторизации предусмотрено подключение Yandex Cloud.

Cloud sync намеренно оставлен за адаптером следующего этапа: текущая версия полностью работает без сети через `localStorage`.

## Публикация

GitHub Pages автоматически собирает ветку `main` в режиме `github`. Адрес после создания репозитория:

```text
https://itstxaviers-svg.github.io/HPLetters/
```

В публичный репозиторий не включаются внутренние спецификации, legacy-прототипы, `node_modules`, `dist`, локальные переменные окружения и секреты.
