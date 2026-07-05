create table if not exists public.tier_landing_content (
  tier sponsor_tier primary key,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists tier_landing_content_set_updated_at on public.tier_landing_content;

create trigger tier_landing_content_set_updated_at
before update on public.tier_landing_content
for each row
execute function public.set_updated_at();

alter table public.tier_landing_content enable row level security;

grant select, insert, update, delete on public.tier_landing_content to authenticated;
grant select, insert, update, delete on public.tier_landing_content to service_role;

create policy "Admins manage tier landing content"
on public.tier_landing_content
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

insert into public.tier_landing_content (tier, content)
values
  (
    'tier_1',
    '{
      "label": "Тариф \"Спутник\"",
      "level": "Уровень доступа: базовый",
      "price": "10 EUR / месяц",
      "teaser": "Вход в закрытый мир, ранний доступ и первые эксклюзивы.",
      "description": null,
      "statusBadge": null,
      "noteBadge": "FIRST STEP",
      "sections": [
        {
          "title": "Что входит",
          "label": "early access",
          "icon": "star",
          "items": [
            "Ранний доступ к фото и видео",
            "Закулисные материалы и спойлеры",
            "Дополнительные кадры вне соцсетей",
            "Лор персонажей и заметки по проектам"
          ]
        }
      ]
    }'::jsonb
  ),
  (
    'tier_2',
    '{
      "label": "Тариф Insider",
      "level": "Уровень доступа: расширенный",
      "price": "25 EUR / месяц",
      "teaser": "Больше процесса, больше backstage и ближе контакт с тем, что создаётся.",
      "description": null,
      "statusBadge": null,
      "noteBadge": "INNER CIRCLE",
      "sections": [
        {
          "title": "Что входит",
          "label": "core access",
          "icon": "spark",
          "items": [
            "Всё из тарифа Спутник",
            "Возможность писать в личные сообщения Telegram",
            "Участие в закрытых голосованиях",
            "Записи стримов и больше backstage"
          ]
        },
        {
          "title": "Ежемесячные бонусы",
          "label": "monthly drops",
          "icon": "gift",
          "items": [
            "Бонусный контент и сливы",
            "Обои для телефона",
            "ИИ-арты по пожеланию",
            "Один контент-запрос в месяц"
          ]
        }
      ]
    }'::jsonb
  ),
  (
    'tier_3',
    '{
      "label": "Тариф \"VIP\"",
      "level": "Уровень доступа: максимальный",
      "price": "50 EUR / месяц",
      "teaser": "Премиальный уровень для тех, кто хочет максимум внимания и максимум материалов.",
      "description": null,
      "statusBadge": "RECOMMENDED",
      "noteBadge": "MOST POPULAR",
      "sections": [
        {
          "title": "Что входит",
          "label": "premium access",
          "icon": "crown",
          "items": [
            "Всё из предыдущих уровней",
            "Эксклюзивные мини-серии и скетчи",
            "Голосовые сообщения и совместные игры",
            "Персональные пожелания и поздравления"
          ]
        },
        {
          "title": "Влияние на проект",
          "label": "priority vote",
          "icon": "vote",
          "items": [
            "Приоритет в голосованиях",
            "Больше контента по запросу",
            "Возможность предлагать идеи для будущих сюжетов",
            "Приоритет среди подписчиков"
          ]
        }
      ]
    }'::jsonb
  ),
  (
    'tier_4',
    '{
      "label": "After Dark",
      "level": "Уровень доступа: самый закрытый",
      "price": "80 EUR / месяц",
      "teaser": "Самая смелая сторона Люмины. Самый тёмный и самый закрытый уровень доступа.",
      "description": null,
      "statusBadge": "UNLOCK THE DARK SIDE",
      "noteBadge": "EXCLUSIVE ACCESS",
      "sections": [
        {
          "title": "Что войдёт",
          "label": "restricted archive",
          "icon": "moon",
          "items": [
            "Все материалы по пилону",
            "Фото и видео тренировок",
            "Танцевальные связки и постановки",
            "Закулисье занятий",
            "Подготовка к тренировкам",
            "Прогресс обучения от первого занятия",
            "Неудачные дубли и забавные моменты",
            "Эксклюзивные эдиты"
          ]
        },
        {
          "title": "Более смелый контент",
          "label": "uncut archive",
          "icon": "flame",
          "items": [
            "Более смелые фотосеты",
            "Более смелые образы",
            "Дополнительные материалы со съёмок",
            "Эксклюзивные backstage-видео"
          ]
        },
        {
          "title": "Дневник развития",
          "label": "private process",
          "icon": "diamond",
          "items": [
            "Личный путь освоения пилона",
            "Цели, достижения и результаты",
            "Подготовка номеров",
            "Отработка элементов",
            "Всё, что остаётся за кадром основной аудитории"
          ]
        },
        {
          "title": "Статус",
          "label": "night rank",
          "icon": "status",
          "items": [
            "Особый статус в сообществе [Dark VIP] + уровень",
            "Максимальный приоритет среди всех уровней подписки",
            "Самые ранние анонсы новых проектов",
            "Доступ ко всем будущим экспериментальным форматам",
            "Косплей + пилон"
          ]
        }
      ]
    }'::jsonb
  )
on conflict (tier) do nothing;
