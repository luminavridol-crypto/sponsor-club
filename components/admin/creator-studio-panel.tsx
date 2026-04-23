"use client";

import { useEffect, useMemo, useState } from "react";

type StudioMode = "tiktok" | "youtubeShorts" | "instagramPost" | "instagramReels" | "pinterest";

type Preset = {
  id: string;
  label: string;
  recommended?: boolean;
};

type SavedIdea = {
  id: string;
  createdAt: string;
  platform: string;
  prompt: string;
  context: string;
  angles: string[];
  audience: string[];
  emotions: string[];
  draft: string;
};

const STORAGE_KEY = "lumina.creator.savedIdeas";

const modes: Array<{
  id: StudioMode;
  title: string;
  hint: string;
}> = [
  { id: "tiktok", title: "TikTok", hint: "hook + удержание" },
  { id: "youtubeShorts", title: "YouTube Shorts", hint: "быстрый сценарий" },
  { id: "instagramPost", title: "Instagram Post", hint: "caption + карусель" },
  { id: "instagramReels", title: "Instagram Reels", hint: "визуальный ритм" },
  { id: "pinterest", title: "Pinterest", hint: "идея для сохранения" }
];

const publishChecklist = [
  "С первого экрана понятно, в чём конфликт или интрига",
  "Есть фраза, которую захочется процитировать или отправить",
  "Идея адаптирована под конкретную платформу, а не написана в пустоту",
  "У ролика есть повод вызвать эмоцию или спор в комментариях"
];

const anglePresets: Preset[] = [
  { id: "conflict", label: "Конфликт", recommended: true },
  { id: "provocative", label: "Провокация", recommended: true },
  { id: "smart", label: "Умнее" },
  { id: "hard", label: "Жёстче" },
  { id: "relatable", label: "Узнавание", recommended: true },
  { id: "comment-bait", label: "На комменты", recommended: true }
];

const audiencePresets: Preset[] = [
  { id: "women", label: "Женская аудитория" },
  { id: "men", label: "Мужская аудитория" },
  { id: "broad", label: "Широкая аудитория", recommended: true }
];

const emotionPresets: Preset[] = [
  { id: "comedy", label: "Комедия", recommended: true },
  { id: "dark-comedy", label: "Чёрный юмор" },
  { id: "anger", label: "Злость" },
  { id: "sad", label: "Грусть" },
  { id: "depressive", label: "Депрессивно" },
  { id: "tension", label: "Напряжение", recommended: true }
];

export function CreatorStudioPanel() {
  const [activeMode, setActiveMode] = useState<StudioMode>("tiktok");
  const [assetPrompt, setAssetPrompt] = useState("");
  const [idea, setIdea] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedAngles, setSelectedAngles] = useState<string[]>(["conflict", "comment-bait"]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>(["broad"]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(["comedy", "tension"]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [selectedSavedIdeaId, setSelectedSavedIdeaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const selectedMode = modes.find((mode) => mode.id === activeMode) ?? modes[0];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as SavedIdea[];
      setSavedIdeas(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedIdeas([]);
    }
  }, []);

  useEffect(() => {
    if (!saveMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveMessage(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [saveMessage]);

  const selectedSavedIdea = useMemo(
    () => savedIdeas.find((item) => item.id === selectedSavedIdeaId) ?? null,
    [savedIdeas, selectedSavedIdeaId]
  );

  async function runCreatorAi() {
    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("action", "create_idea");
    formData.set("platform", selectedMode.title);
    formData.set("prompt", assetPrompt);
    formData.set("context", idea);
    formData.set("angles", selectedAngles.join(", "));
    formData.set("audience", selectedAudience.join(", "));
    formData.set("emotions", selectedEmotions.join(", "));

    try {
      const response = await fetch("/api/admin/creator-ai", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "AI-запрос не удался.");
      }

      setDraft(data.text || "");
      setSelectedSavedIdeaId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI-запрос не удался.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearCreate() {
    setActiveMode("tiktok");
    setAssetPrompt("");
    setIdea("");
    setDraft("");
    setSelectedAngles(["conflict", "comment-bait"]);
    setSelectedAudience(["broad"]);
    setSelectedEmotions(["comedy", "tension"]);
    setSelectedSavedIdeaId(null);
    setError("");
  }

  function togglePreset(
    current: string[],
    setValue: (value: string[]) => void,
    presetId: string
  ) {
    if (current.includes(presetId)) {
      setValue(current.filter((item) => item !== presetId));
      return;
    }

    setValue([...current, presetId]);
  }

  function saveCurrentIdea() {
    if (!draft.trim()) {
      return;
    }

    const nextIdea: SavedIdea = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      platform: selectedMode.title,
      prompt: assetPrompt.trim(),
      context: idea.trim(),
      angles: selectedAngles,
      audience: selectedAudience,
      emotions: selectedEmotions,
      draft
    };

    const nextIdeas = [nextIdea, ...savedIdeas].slice(0, 20);
    setSavedIdeas(nextIdeas);
    setSelectedSavedIdeaId(nextIdea.id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdeas));
    setSaveMessage("Идея сохранена");
  }

  function openSavedIdea(item: SavedIdea) {
    setSelectedSavedIdeaId(item.id);
    setDraft(item.draft);
    setAssetPrompt(item.prompt);
    setIdea(item.context);
    setSelectedAngles(item.angles);
    setSelectedAudience(item.audience);
    setSelectedEmotions(item.emotions);

    const mode = modes.find((entry) => entry.title === item.platform);
    if (mode) {
      setActiveMode(mode.id);
    }
  }

  function deleteSavedIdea(id: string) {
    const nextIdeas = savedIdeas.filter((item) => item.id !== id);
    setSavedIdeas(nextIdeas);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdeas));

    if (selectedSavedIdeaId === id) {
      setSelectedSavedIdeaId(null);
      if (selectedSavedIdea?.id === id) {
        setDraft("");
      }
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.96fr)_minmax(380px,0.8fr)]">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Create</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Создать идею для соцсетей</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
                Здесь только то, что реально нужно: платформа, угол, эмоция, задача и короткий сильный
                результат без лишней аналитики.
              </p>
            </div>
            <button
              type="button"
              onClick={clearCreate}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/65 transition hover:border-white/25 hover:text-white"
            >
              Очистить
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {modes.map((mode) => {
              const active = mode.id === activeMode;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveMode(mode.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-cyanGlow/45 bg-cyanGlow/12 text-white shadow-[0_0_24px_rgba(111,234,255,0.12)]"
                      : "border-white/10 bg-black/10 text-white/68 hover:border-accent/30 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-semibold">{mode.title}</span>
                  <span className="mt-1 block text-xs text-white/40">{mode.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-4">
            <PresetGroup
              title="Угол"
              items={anglePresets}
              selected={selectedAngles}
              onToggle={(presetId) => togglePreset(selectedAngles, setSelectedAngles, presetId)}
            />
            <PresetGroup
              title="Аудитория"
              items={audiencePresets}
              selected={selectedAudience}
              onToggle={(presetId) => togglePreset(selectedAudience, setSelectedAudience, presetId)}
            />
            <PresetGroup
              title="Эмоция"
              items={emotionPresets}
              selected={selectedEmotions}
              onToggle={(presetId) => togglePreset(selectedEmotions, setSelectedEmotions, presetId)}
            />
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/68">Задача для AI</span>
              <textarea
                value={assetPrompt}
                onChange={(event) => setAssetPrompt(event.target.value)}
                placeholder="Например: придумай провокационный скетч о ситуации, где девушка делает вид, что ей всё равно, но по факту одержима темой"
                className="min-h-[112px]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/68">Контекст, стиль или ограничения</span>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="Например: без банальщины, с умным конфликтом, коротко, 5 hooks, сильные фразы для комментов"
                className="min-h-[96px]"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={runCreatorAi}
              disabled={isLoading}
              className="w-full rounded-[1.15rem] border border-accent/45 bg-gradient-to-r from-accent/85 to-[#c457f5] px-5 py-4 text-base font-medium text-white transition hover:brightness-110"
            >
              {isLoading ? "AI думает..." : "Собрать сценарий"}
            </button>
            <button
              type="button"
              onClick={saveCurrentIdea}
              disabled={!draft.trim()}
              className="w-full rounded-[1.15rem] border border-cyanGlow/35 bg-cyanGlow/10 px-5 py-4 text-base font-medium text-cyanGlow transition hover:bg-cyanGlow/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Сохранить идею
            </button>
          </div>

          {error ? (
            <p className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          {saveMessage ? (
            <p className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {saveMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyanGlow">Result</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Рабочий результат</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">Платформа</p>
              <p className="mt-1 text-sm text-white/72">{selectedMode.title}</p>
            </div>
          </div>

          <div className="mt-5 min-h-[420px] rounded-[24px] border border-white/10 bg-black/25 p-4">
            {draft ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/76">{draft}</pre>
            ) : (
              <EmptyState
                title="Здесь появится сценарий"
                text="Опиши задачу, выбери платформу и пресеты. AI вернёт короткий рабочий скелет, который уже можно докручивать под себя."
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.62fr)]">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Vault</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Сохранённые идеи</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
                Личный мини-архив прямо в браузере. Можно быстро вернуться к сильной идее, открыть её и
                докрутить дальше.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-sm text-white/58">
              {savedIdeas.length} шт.
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {savedIdeas.length ? (
              savedIdeas.map((item) => {
                const isActive = item.id === selectedSavedIdeaId;

                return (
                  <div
                    key={item.id}
                    className={`rounded-[22px] border p-4 transition ${
                      isActive
                        ? "border-cyanGlow/35 bg-cyanGlow/10"
                        : "border-white/10 bg-black/15"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{item.platform}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/68">
                          {item.prompt || "Сохранённый сценарий без отдельного заголовка"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSavedIdea(item.id)}
                        className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-white/55 transition hover:border-rose-300/30 hover:text-rose-200"
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.angles.slice(0, 2).map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                      {item.emotions.slice(0, 2).map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-white/38">{formatIdeaDate(item.createdAt)}</p>
                      <button
                        type="button"
                        onClick={() => openSavedIdea(item)}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68 transition hover:border-cyanGlow/35 hover:text-cyanGlow"
                      >
                        Открыть
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 p-5 text-sm leading-6 text-white/50">
                Пока пусто. Сгенерируй сильную идею и нажми «Сохранить идею».
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-cyanGlow">Selected</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Что сейчас открыто</h2>
            {selectedSavedIdea ? (
              <div className="mt-4 space-y-3 rounded-[22px] border border-white/10 bg-black/15 p-4">
                <p className="text-sm font-semibold text-white">{selectedSavedIdea.platform}</p>
                <p className="text-sm leading-6 text-white/70">
                  {selectedSavedIdea.prompt || "Без отдельной задачи"}
                </p>
                <p className="text-xs text-white/38">{formatIdeaDate(selectedSavedIdea.createdAt)}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/52">
                После сохранения здесь будет видно, с какой идеей ты сейчас работаешь.
              </p>
            )}
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Before publish</p>
            <div className="mt-4 grid gap-3">
              {publishChecklist.map((item, index) => (
                <div key={item} className="rounded-[20px] border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">0{index + 1}</p>
                  <p className="mt-3 text-sm leading-6 text-white/70">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  title,
  text,
  onClick
}: {
  active: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border p-4 text-left transition ${
        active
          ? "border-accent/45 bg-accent/15 text-white"
          : "border-white/10 bg-black/10 text-white/65 hover:border-accent/30 hover:text-white"
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
    </button>
  );
}

function PresetGroup({
  title,
  items,
  selected,
  onToggle
}: {
  title: string;
  items: Preset[];
  selected: string[];
  onToggle: (presetId: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-white/60">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                active
                  ? "border-accent/45 bg-accent/15 text-white"
                  : "border-white/10 bg-black/10 text-white/65 hover:border-accent/30 hover:text-white"
              }`}
            >
              <span>{item.label}</span>
              {item.recommended ? <span className="ml-2 text-[10px] uppercase text-cyanGlow">hot</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/45">
      {children}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
      <div className="flex h-18 w-18 items-center justify-center rounded-full border border-accent/30 bg-accent/10 p-5 text-accentSoft">
        <SparkIcon />
      </div>
      <p className="mt-5 text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-white/50">{text}</p>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatIdeaDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-UA", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}
