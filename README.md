# Learn Letters

## Current class release plan

- Group `14`: all 25 letters are open without prerequisites.
- Group `15`: all lessons are currently closed.
- Group `16`: all 25 letters are open without prerequisites.
- Combined group `11-12`: the full alphabet is available as a sequential path; each next letter opens only after the previous letter is completed.
- Teacher test mode keeps every letter open and never changes a child's saved progress.

Student profiles and progress are saved only in this browser on this device. Cloud sync is disabled. The teacher dashboard shows only profiles saved on the same device; it does not combine progress from children's phones. Clearing browser data or switching devices does not transfer progress.

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
- локальное хранение прогресса, попыток, настроек и наград;
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

Учительская блокировка защищает кабинет только на текущем устройстве. Синхронизация с Yandex Cloud отключена; существующие данные в YDB этим обновлением не удаляются.

## Публикация

GitHub Pages автоматически собирает ветку `main` в режиме `github`. Адрес после создания репозитория:

```text
https://itstxaviers-svg.github.io/HPLetters/
```

В публичный репозиторий не включаются внутренние спецификации, legacy-прототипы, `node_modules`, `dist`, локальные переменные окружения и секреты.
