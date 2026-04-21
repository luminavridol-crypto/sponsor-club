# Sponsor Lounge MVP

Закрытый сайт для спонсоров с доступом по приглашениям, tier-уровнями, приватным контентом и админ-панелью.

## Стек

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + Storage
- Vercel для деплоя фронтенда

## Что уже реализовано

- landing page
- логин по email и паролю
- signup только по invite link или invite code
- 3 sponsor tier: `tier_1`, `tier_2`, `tier_3`
- server-side защита приватных маршрутов
- server-side tier checks для ленты и карточки поста
- админ-панель с управлением постами, инвайтами и пользователями
- публикации типов `gallery`, `video`, `text`, `announcement`
- загрузка media в Supabase Storage
- смена tier, блокировка и удаление доступа

## Структура проекта

```text
app/
  (auth)/login
  (auth)/invite
  (private)/dashboard
  (private)/feed
  (private)/profile
  (admin)/admin
  api/auth/callback
components/
lib/
  auth/
  data/
  supabase/
  utils/
supabase/migrations/
```

## Настройка локально

1. Создайте проект в Supabase.
2. В `SQL Editor` выполните файл [supabase/migrations/001_init.sql](./supabase/migrations/001_init.sql).
3. Создайте приватный storage bucket `post-media`.
4. Скопируйте `.env.example` в `.env.local`.
5. Заполните значения:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

6. Установите зависимости:

```bash
npm install
```

7. Запустите проект:

```bash
npm run dev
```

8. Откройте `http://localhost:3000`.

## Как создать первого администратора

Поскольку свободная регистрация отключена, есть два простых пути:

1. Создайте пользователя вручную в `Supabase Auth`.
2. Добавьте запись в `public.profiles` с `role = 'admin'`, `tier = 'tier_3'`, `access_status = 'active'`.

Пример SQL:

```sql
insert into public.profiles (id, email, role, tier, access_status, display_name)
values (
  'USER_ID_FROM_AUTH',
  'admin@example.com',
  'admin',
  'tier_3',
  'active',
  'Main Admin'
);
```

## Invite flow

1. Админ входит в систему.
2. В `/admin/invites` создаёт invite.
3. Пользователь получает код или ссылку вида:

```text
https://your-domain.com/invite?code=VIP-ABCDEFGH
```

4. Пользователь завершает регистрацию.
5. Система:
   - проверяет invite
   - создаёт пользователя через `service role`
   - создаёт профиль
   - помечает invite использованным
   - автоматически логинит пользователя

## Деплой на Vercel

1. Загрузите проект в GitHub.
2. Импортируйте репозиторий в Vercel.
3. Добавьте те же environment variables, что и в `.env.local`.
4. Убедитесь, что `NEXT_PUBLIC_SITE_URL` указывает на production-домен.
5. После деплоя проверьте:
   - логин
   - invite signup
   - создание постов
   - signed media URLs

## Рекомендации для следующей итерации

- добавить pagination в feed
- вынести формы в отдельные client-компоненты со статусами загрузки
- добавить редактирование thumbnail и post media
- добавить email-отправку invite links
- добавить audit log для admin actions

## Важные замечания по безопасности

- Не храните `SUPABASE_SERVICE_ROLE_KEY` на клиенте.
- Весь admin control и invite signup должен работать только на сервере.
- Не полагайтесь только на скрытие кнопок в интерфейсе: доступ защищён middleware, server components и RLS.
- Для production лучше включить строгую политику паролей и rate limiting на уровне Supabase/Auth Edge.
