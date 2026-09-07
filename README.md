# Learn Letters

## Current class release plan

- Group `14`: letters are released in order through `Hh` (16 letters).
- Groups `15` and `16`: the first two letters are currently released (`Ss`, then `Ii`).
- Combined group `11-12`: the full alphabet is available as a sequential path; each next letter opens only after the previous letter is completed.
- Teacher test mode keeps every letter open and never changes a child's saved progress.

Student profiles and progress are saved locally first and synchronized to the Yandex Cloud student database. A child is added to the teacher dashboard automatically after signing in with a valid group code.

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
